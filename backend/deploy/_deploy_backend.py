"""
Build Nest locally, upload to VPS, install, migrate, PM2 start.
Does NOT touch existing gunicorn / system postgres / Caddy landing beyond opening :3000.
"""
from __future__ import annotations

import io
import os
import secrets
import sys
import tarfile
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "45.93.136.64"
USER = "root"
PASSWORD = "Sarment-123#"
REMOTE_DIR = "/opt/studhub/backend"
LOCAL_BACKEND = Path(__file__).resolve().parents[1]

DB_PASSWORD = "StudHub_Db_ChangeMe_2026!"
JWT_ACCESS = secrets.token_urlsafe(48)
JWT_REFRESH = secrets.token_urlsafe(48)

INCLUDE = [
    "package.json",
    "package-lock.json",
    "prisma",
    "dist",
    "nest-cli.json",
    "tsconfig.json",
    "tsconfig.build.json",
]

SKIP_DIRS = {"node_modules", ".git", "uploads", "coverage", "test", "deploy"}


def make_tarball() -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for name in INCLUDE:
            path = LOCAL_BACKEND / name
            if not path.exists():
                print(f"WARN missing: {path}")
                continue
            # Add whole tree; filter junk dirs
            def _filter(ti: tarfile.TarInfo) -> tarfile.TarInfo | None:
                parts = Path(ti.name).parts
                if any(p in SKIP_DIRS for p in parts):
                    return None
                return ti

            tar.add(path, arcname=name, filter=_filter)
    js_count = sum(1 for _ in (LOCAL_BACKEND / "dist").rglob("*.js"))
    print(f"Local dist JS files: {js_count}")
    if js_count < 1:
        raise SystemExit("dist/ has no .js — abort upload")
    return buf.getvalue()


ENV_CONTENT = f"""NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://studhub:{DB_PASSWORD}@127.0.0.1:5433/studhub?schema=public
REDIS_URL=redis://127.0.0.1:6379
REDIS_DB=0

JWT_ACCESS_SECRET={JWT_ACCESS}
JWT_REFRESH_SECRET={JWT_REFRESH}
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
JWT_ISSUER=studhub.tn
JWT_AUDIENCE=studhub-api
BCRYPT_COST=12

CORS_ORIGIN=capacitor://localhost,ionic://localhost,http://localhost,https://localhost,http://localhost:4200,http://45.93.136.64,http://45.93.136.64:3000

UPLOAD_MODE=local
UPLOAD_LOCAL_DIR=./uploads
UPLOAD_PUBLIC_URL_PREFIX=http://45.93.136.64:3000/uploads
UPLOAD_MAX_SIZE_MB=15
UPLOAD_ALLOWED_MIMES=image/jpeg,image/png,image/webp,image/gif,audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain

THROTTLE_TTL=60
THROTTLE_LIMIT=200
AUTH_THROTTLE_TTL=60
AUTH_THROTTLE_LIMIT=30

SWAGGER_ENABLED=true
SWAGGER_PATH=docs
SWAGGER_USER=admin
SWAGGER_PASS={secrets.token_urlsafe(12)}

LOG_LEVEL=info
LOG_PRETTY_PRINT=false

TWILIO_ENABLED=false
OTP_SMS_TEMPLATE=StudHub: votre code est {{{{code}}}}. Valide 10 min.

# Emails — SMTP OVH VicciSmart (même boîte que allato.fr)
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contact@viccismart-enr.com
SMTP_PASS=12345678K
EMAIL_FROM=contact@viccismart-enr.com
EMAIL_FROM_NAME=StudHub
SUPPORT_INBOX=contact@viccismart-enr.com
EMAIL_CONSOLE_FALLBACK=false
EMAIL_RESET_TTL_MINUTES=10

FIREBASE_SERVICE_ACCOUNT_PATH=
FIREBASE_SERVICE_ACCOUNT_JSON=
"""


def ssh_connect() -> paramiko.SSHClient:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(
        HOST,
        username=USER,
        password=PASSWORD,
        timeout=45,
        look_for_keys=False,
        allow_agent=False,
    )
    return c


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 600) -> tuple[int, str]:
    print(f"\n$ {cmd}")
    _i, o, e = c.exec_command(cmd, timeout=timeout, get_pty=True)
    text = (o.read() + e.read()).decode("utf-8", errors="replace")
    code = o.channel.recv_exit_status()
    if text.strip():
        print(text[-12000:] if len(text) > 12000 else text)
    print(f"[exit {code}]")
    if code != 0:
        raise RuntimeError(f"Remote command failed ({code}): {cmd}")
    return code, text


def main() -> None:
    dist = LOCAL_BACKEND / "dist"
    if not dist.exists() or not any(dist.iterdir()):
        raise SystemExit("dist/ missing — run npm run build in backend first")

    print("Packing backend…")
    data = make_tarball()
    print(f"Tarball size: {len(data) / 1024:.0f} KiB")

    c = ssh_connect()
    print("Connected")

    run(c, f"mkdir -p {REMOTE_DIR}/uploads {REMOTE_DIR}/releases")
    run(c, f"ufw allow 3000/tcp || true")

    stamp = time.strftime("%Y%m%d-%H%M%S")
    remote_tar = f"/tmp/studhub-backend-{stamp}.tar.gz"
    print(f"Uploading to {remote_tar}…")
    sftp = c.open_sftp()
    with sftp.file(remote_tar, "wb") as f:
        f.write(data)
    # Ne pas écraser un .env déjà en place (JWT secrets / DB)
    env_exists = False
    try:
        sftp.stat(f"{REMOTE_DIR}/.env")
        env_exists = True
    except OSError:
        env_exists = False
    if not env_exists:
        with sftp.file(f"{REMOTE_DIR}/.env", "w") as f:
            f.write(ENV_CONTENT)
        print(".env created")
    else:
        print(".env preserved (existing)")
    sftp.close()

    # Keep infra compose; extract app into REMOTE_DIR without wiping docker-compose.infra.yml
    run(
        c,
        f"""
set -e
cd {REMOTE_DIR}
# preserve infra files
cp -a docker-compose.infra.yml /tmp/studhub-infra.yml.bak 2>/dev/null || true
cp -a .env.production.example /tmp/studhub-envex.bak 2>/dev/null || true
tar -xzf {remote_tar} -C {REMOTE_DIR}
test -f /tmp/studhub-infra.yml.bak && cp -a /tmp/studhub-infra.yml.bak docker-compose.infra.yml || true
test -f /tmp/studhub-envex.bak && cp -a /tmp/studhub-envex.bak .env.production.example || true
mkdir -p uploads
rm -f {remote_tar}
ls -la
""",
    )

    run(
        c,
        f"""
set -e
cd {REMOTE_DIR}
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
""",
        timeout=900,
    )

    run(
        c,
        f"""
set -e
cd {REMOTE_DIR}
pm2 delete studhub-api 2>/dev/null || true
pm2 start dist/main.js --name studhub-api --cwd {REMOTE_DIR} --env production
pm2 save
pm2 list
sleep 2
curl -sS -o /dev/null -w '%{{http_code}}' http://127.0.0.1:3000/api/v1/health || curl -sS -o /dev/null -w '%{{http_code}}' http://127.0.0.1:3000/api/health || curl -sS http://127.0.0.1:3000/ | head -c 200 || true
echo
ss -tlnp | grep 3000 || true
""",
        timeout=120,
    )

    c.close()
    print("\nDeploy OK — API http://45.93.136.64:3000")


if __name__ == "__main__":
    main()
