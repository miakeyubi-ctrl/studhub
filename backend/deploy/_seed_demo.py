"""Upload prisma/seed.ts and run full demo seed on VPS."""
from __future__ import annotations

import os
import sys

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "45.93.136.64"
USER = "root"
PASSWORD = "Sarment-123#"
REMOTE_DIR = "/opt/studhub/backend"
LOCAL_SEED_TS = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "prisma", "seed.ts")
)
LOCAL_SEED_JS = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "prisma", "seed.js")
)


def main() -> None:
    if not os.path.isfile(LOCAL_SEED_JS):
        raise SystemExit(f"Missing compiled seed: {LOCAL_SEED_JS} (run tsc on seed.ts first)")

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=45, look_for_keys=False, allow_agent=False)

    sftp = c.open_sftp()
    if os.path.isfile(LOCAL_SEED_TS):
        print(f"Upload seed.ts")
        sftp.put(LOCAL_SEED_TS, f"{REMOTE_DIR}/prisma/seed.ts")
    print(f"Upload seed.js")
    sftp.put(LOCAL_SEED_JS, f"{REMOTE_DIR}/prisma/seed.js")
    sftp.close()

    migrate_cmd = f"cd {REMOTE_DIR} && npx prisma migrate deploy"
    print(f"$ {migrate_cmd}")
    _i, o, e = c.exec_command(migrate_cmd, timeout=180, get_pty=True)
    print((o.read() + e.read()).decode("utf-8", errors="replace"))
    migrate_code = o.channel.recv_exit_status()
    print(f"[migrate exit {migrate_code}]")
    if migrate_code != 0:
        c.close()
        raise SystemExit(migrate_code)

    seed_cmd = f"cd {REMOTE_DIR} && node prisma/seed.js"
    print(f"$ {seed_cmd}")
    _i, o, e = c.exec_command(seed_cmd, timeout=300, get_pty=True)
    text = (o.read() + e.read()).decode("utf-8", errors="replace")
    code = o.channel.recv_exit_status()
    print(text)
    print(f"[exit {code}]")
    c.close()
    if code != 0:
        raise SystemExit(code)
    print("\nDemo seed OK on VPS")


if __name__ == "__main__":
    main()
