"""Marque les migrations Prisma comme appliquées (DB déjà à jour) et redémarre l'API."""
from __future__ import annotations

import sys

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "45.93.136.64"
PASSWORD = "Sarment-123#"
REMOTE = "/opt/studhub/backend"

MIGRATIONS = [
    "20260926195334_init",
    "20260929024500_system_welcome_chat",
    "20260929110000_agent_follow",
    "20260929122000_property_product_likes_views",
    "20260929124000_listing_unique_views",
    "20260929210000_product_provider_favorites",
    "20260930160000_conversation_peer_student",
    "20261001120000_partners",
    "20261003010000_partner_login",
    "20261003020000_partner_announcements",
    "20261004140000_property_geo_reports",
    "20261006220000_user_agent_blocked_at",
]


def main() -> None:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username="root", password=PASSWORD, timeout=40, look_for_keys=False, allow_agent=False)

    resolves = "\n".join(
        f"npx prisma migrate resolve --applied {m} || true" for m in MIGRATIONS
    )
    cmd = f"""
set -e
cd {REMOTE}
{resolves}
npx prisma migrate deploy
pm2 delete studhub-api 2>/dev/null || true
pm2 start dist/main.js --name studhub-api --cwd {REMOTE} --env production
pm2 save
sleep 2
pm2 list
curl -sS -o /dev/null -w '%{{http_code}}' http://127.0.0.1:3000/api/v1/health || true
echo
"""
    _i, o, e = c.exec_command(cmd, timeout=180, get_pty=True)
    print((o.read() + e.read()).decode("utf-8", errors="replace"))
    c.close()


if __name__ == "__main__":
    main()
