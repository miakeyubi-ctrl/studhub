"""Supprime le compte userstudhub (ou email contenant userstudhub) sur le VPS."""
from __future__ import annotations

import sys

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "45.93.136.64"
PASSWORD = "Sarment-123#"
REMOTE_DIR = "/opt/studhub/backend"

DELETE_JS = r"""
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const needle = 'userstudhub';
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: needle, mode: 'insensitive' } },
        { fullName: { contains: needle, mode: 'insensitive' } },
      ],
    },
    select: { id: true, email: true, fullName: true, role: true },
  });
  console.log('FOUND', JSON.stringify(users));
  if (!users.length) {
    // fallback: exact email variants
    const alts = [
      'userstudhub@gmail.com',
      'userstudhub@studhub.tn',
      'userstudhub@test.com',
      'userstudhub',
    ];
    for (const email of alts) {
      const u = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, email: true, fullName: true, role: true },
      });
      if (u) users.push(u);
    }
    console.log('ALT_FOUND', JSON.stringify(users));
  }
  for (const u of users) {
    if (u.role === 'ADMIN') {
      console.log('SKIP_ADMIN', u.email);
      continue;
    }
    await prisma.user.delete({ where: { id: u.id } });
    console.log('DELETED', u.id, u.email);
  }
}

main()
  .catch((e) => {
    console.error('ERR', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
"""


def main() -> None:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(
        HOST,
        username="root",
        password=PASSWORD,
        timeout=40,
        look_for_keys=False,
        allow_agent=False,
    )
    sftp = c.open_sftp()
    remote = f"{REMOTE_DIR}/_delete_userstudhub.js"
    with sftp.file(remote, "w") as f:
        f.write(DELETE_JS)
    sftp.close()
    cmd = f"cd {REMOTE_DIR} && node _delete_userstudhub.js && rm -f _delete_userstudhub.js"
    _i, o, e = c.exec_command(cmd, timeout=90, get_pty=True)
    out = (o.read() + e.read()).decode("utf-8", errors="replace")
    print(out)
    c.close()
    if "ERR" in out or "Error" in out:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
