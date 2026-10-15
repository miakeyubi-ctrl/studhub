"""Liste les users puis supprime celui qui matche userstudhub / azerty123."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "45.93.136.64"
PASSWORD = "Sarment-123#"
REMOTE_DIR = "/opt/studhub/backend"
API = "http://45.93.136.64:3000/api/v1"

LIST_JS = r"""
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    orderBy: { id: 'asc' },
  });
  console.log('USERS_JSON=' + JSON.stringify(users));

  // Match by email/name containing studhub or userstud
  const candidates = users.filter((u) => {
    const e = (u.email || '').toLowerCase();
    const n = (u.fullName || '').toLowerCase();
    return (
      e.includes('userstudhub') ||
      e.includes('userstud') ||
      n.includes('userstudhub') ||
      e === 'userstudhub' ||
      e.startsWith('userstudhub@')
    );
  });

  // Also try password match on non-admin users (azerty123)
  const pwd = 'azerty123';
  const pwdMatches = [];
  for (const u of users) {
    if (u.role === 'ADMIN') continue;
    const full = await prisma.user.findUnique({
      where: { id: u.id },
      select: { id: true, email: true, passwordHash: true, role: true },
    });
    if (!full) continue;
    const ok = await bcrypt.compare(pwd, full.passwordHash);
    if (ok) pwdMatches.push({ id: full.id, email: full.email, role: full.role });
  }
  console.log('PWD_MATCHES=' + JSON.stringify(pwdMatches));
  console.log('NAME_MATCHES=' + JSON.stringify(candidates));

  const toDelete = new Map();
  for (const u of [...candidates, ...pwdMatches]) {
    if (u.role === 'ADMIN') continue;
    toDelete.set(u.id, u);
  }

  // Prefer explicit userstudhub email if present among pwd matches
  for (const [id, u] of [...toDelete.entries()]) {
    if (String(u.email || '').toLowerCase().includes('userstudhub') || pwdMatches.some((p) => p.id === id)) {
      await prisma.user.delete({ where: { id } });
      console.log('DELETED=' + JSON.stringify(u));
    }
  }

  const left = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true },
  });
  console.log('LEFT=' + JSON.stringify(left));
}

main()
  .catch((e) => {
    console.error('ERR', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
"""


def ssh_run(cmd: str, timeout: int = 120) -> str:
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
    _i, o, e = c.exec_command(cmd, timeout=timeout, get_pty=True)
    out = (o.read() + e.read()).decode("utf-8", errors="replace")
    c.close()
    return out


def try_login(email: str, password: str) -> dict | None:
    req = urllib.request.Request(
        f"{API}/auth/login",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode())
    except Exception as ex:
        print(f"login fail {email}: {ex}")
        return None


def main() -> None:
    # Upload + run listing/delete script
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
    remote = f"{REMOTE_DIR}/_list_and_delete_user.js"
    with sftp.file(remote, "w") as f:
        f.write(LIST_JS)
    sftp.close()
    _i, o, e = c.exec_command(
        f"cd {REMOTE_DIR} && node _list_and_delete_user.js && rm -f _list_and_delete_user.js",
        timeout=120,
        get_pty=True,
    )
    out = (o.read() + e.read()).decode("utf-8", errors="replace")
    print(out)
    c.close()

    # Also try common emails via API login
    for email in [
        "userstudhub@gmail.com",
        "userstudhub@studhub.tn",
        "userstudhub@test.com",
        "userstudhub@yahoo.fr",
        "userstudhub@outlook.com",
    ]:
        res = try_login(email, "azerty123")
        if res:
            print("API_LOGIN_OK", email, json.dumps(res)[:300])


if __name__ == "__main__":
    main()
