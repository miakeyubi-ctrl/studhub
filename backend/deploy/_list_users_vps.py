"""Liste uniquement les users VPS (pas de suppression)."""
from __future__ import annotations

import sys

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "45.93.136.64"
PASSWORD = "Sarment-123#"
REMOTE_DIR = "/opt/studhub/backend"

JS = r"""
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    orderBy: { id: 'asc' },
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
"""


def main() -> None:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PASSWORD, timeout=40, look_for_keys=False, allow_agent=False)
    sftp = c.open_sftp()
    remote = f"{REMOTE_DIR}/_list_users.js"
    with sftp.file(remote, "w") as f:
        f.write(JS)
    sftp.close()
    _i, o, e = c.exec_command(f"cd {REMOTE_DIR} && node _list_users.js && rm -f _list_users.js", timeout=60, get_pty=True)
    print((o.read() + e.read()).decode("utf-8", errors="replace"))
    c.close()


if __name__ == "__main__":
    main()
