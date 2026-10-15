"""Seed partner login account on VPS (partner@studhub.tn / Azerty123)."""
from __future__ import annotations

import sys

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "45.93.136.64"
USER = "root"
PASSWORD = "Sarment-123#"
REMOTE_DIR = "/opt/studhub/backend"

SCRIPT = r"""
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
(async () => {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash('Azerty123', 12);
  const loginEmail = 'partner@studhub.tn';
  let p = await prisma.partner.findFirst({ where: { name: 'Talan Tunisie' } });
  if (!p) p = await prisma.partner.findFirst({ orderBy: { id: 'asc' } });
  if (!p) {
    p = await prisma.partner.create({
      data: {
        name: 'Partenaire Démo',
        category: 'Entreprise',
        offer: 'Offre démo StudHub',
        logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=200&auto=format&fit=crop',
        loginEmail,
        passwordHash,
        isActive: true,
        sortOrder: 0,
        viewsCount: 42,
        likesCount: 10,
        clicksCount: 7,
      },
    });
    console.log('CREATED', p.id, p.loginEmail);
  } else {
    p = await prisma.partner.update({
      where: { id: p.id },
      data: { loginEmail, passwordHash },
    });
    console.log('UPDATED', p.id, p.loginEmail);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
"""


def main() -> None:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=45, look_for_keys=False, allow_agent=False)
    sftp = c.open_sftp()
    with sftp.file(f"{REMOTE_DIR}/_seed_partner_tmp.js", "w") as f:
        f.write(SCRIPT)
    sftp.close()

    cmd = f"cd {REMOTE_DIR} && node _seed_partner_tmp.js && rm -f _seed_partner_tmp.js"
    print(f"$ {cmd}")
    _i, o, e = c.exec_command(cmd, timeout=120, get_pty=True)
    text = (o.read() + e.read()).decode("utf-8", errors="replace")
    code = o.channel.recv_exit_status()
    print(text)
    print(f"[exit {code}]")
    if code != 0:
        raise SystemExit(code)

    # Verify public login
    check = (
        "curl -sS -X POST http://127.0.0.1:3000/api/v1/auth/partner/login "
        "-H 'Content-Type: application/json' "
        "-d '{\"email\":\"partner@studhub.tn\",\"password\":\"Azerty123\"}'"
    )
    print(f"\n$ {check}")
    _i, o, e = c.exec_command(check, timeout=30, get_pty=True)
    text = (o.read() + e.read()).decode("utf-8", errors="replace")
    print(text[:1500])
    c.close()
    print("\nPartner seed OK")


if __name__ == "__main__":
    main()
