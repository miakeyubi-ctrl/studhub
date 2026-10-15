"""
Vide la base StudHub sur le VPS (données démo) et recrée uniquement l'admin.
"""
from __future__ import annotations

import sys

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "45.93.136.64"
PASSWORD = "Sarment-123#"
REMOTE_DIR = "/opt/studhub/backend"

WIPE_JS = r"""
const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);

  const passwordHash = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@studhub.tn',
      passwordHash,
      fullName: 'Administrateur StudHub',
      role: Role.ADMIN,
      emailVerifiedAt: new Date(),
    },
  });

  const users = await prisma.user.count();
  const products = await prisma.product.count();
  const properties = await prisma.property.count();
  const agents = await prisma.agent.count();
  console.log('WIPED_OK admin=' + admin.email + ' users=' + users + ' agents=' + agents + ' products=' + products + ' properties=' + properties);
}

main()
  .catch((e) => { console.error('WIPE_FAIL', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
"""


def main() -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST,
        username="root",
        password=PASSWORD,
        timeout=45,
        look_for_keys=False,
        allow_agent=False,
    )

    def run(cmd: str, timeout: int = 180) -> str:
        print(f"$ {cmd}")
        _i, o, e = client.exec_command(cmd, timeout=timeout, get_pty=True)
        out = (o.read() + e.read()).decode("utf-8", errors="replace")
        print(out[-8000:] if len(out) > 8000 else out)
        code = o.channel.recv_exit_status()
        if code != 0:
            raise RuntimeError(f"failed ({code}): {cmd}")
        return out

    run(f"cd {REMOTE_DIR} && npx prisma migrate deploy", timeout=300)

    sftp = client.open_sftp()
    with sftp.file(f"{REMOTE_DIR}/_wipe_once.js", "w") as f:
        f.write(WIPE_JS)
    sftp.close()

    run(f"cd {REMOTE_DIR} && node _wipe_once.js", timeout=120)
    run(f"rm -f {REMOTE_DIR}/_wipe_once.js")
    run("pm2 restart studhub-api --update-env")
    run("sleep 2; curl -sS -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:3000/api/v1/health || true")
    client.close()
    print("DONE — base vide + admin: admin@studhub.tn / Admin@123456")


if __name__ == "__main__":
    main()
