"""Verify SMTP init on VPS + send real register OTP."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "45.93.136.64"
PASSWORD = "Sarment-123#"


def ssh_run(cmd: str, timeout: int = 60) -> str:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST,
        username="root",
        password=PASSWORD,
        timeout=30,
        look_for_keys=False,
        allow_agent=False,
    )
    _i, o, e = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out = (o.read() + e.read()).decode("utf-8", errors="replace")
    client.close()
    return out


def main() -> None:
    print("--- env SMTP keys ---")
    print(
        ssh_run(
            "grep -E '^(SMTP_|EMAIL_|SUPPORT_|NODE_ENV)' /opt/studhub/backend/.env | sed 's/PASS=.*/PASS=***/'"
        )
    )

    print("--- EmailService / SMTP in dist ---")
    print(
        ssh_run(
            "grep -R \"SMTP prêt\" /opt/studhub/backend/dist -n | head -5; "
            "ls /opt/studhub/backend/dist/common/email 2>/dev/null || ls /opt/studhub/backend/dist/src/common/email 2>/dev/null || echo no-email-dir"
        )
    )

    print("--- restart fresh + capture boot ---")
    print(ssh_run("pm2 restart studhub-api --update-env && sleep 4"))
    print(
        ssh_run(
            "pm2 logs studhub-api --lines 200 --nostream 2>/dev/null | "
            "grep -iE 'SMTP|EmailService|email|transporteur|Resend|FCM|started' | tail -40"
        )
    )

    payload = json.dumps({"email": "studhub.smtp.test@yopmail.com"}).encode()
    req = urllib.request.Request(
        f"http://{HOST}:3000/api/v1/auth/send-register-otp",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    print("--- OTP POST /api/v1/auth/send-register-otp ---")
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            print(resp.status, resp.read().decode("utf-8", errors="replace")[:800])
    except urllib.error.HTTPError as err:
        print(err.code, err.read().decode("utf-8", errors="replace")[:800])
    except Exception as exc:
        print("ERR", exc)

    print("--- logs after OTP ---")
    print(
        ssh_run(
            "pm2 logs studhub-api --lines 80 --nostream 2>/dev/null | "
            "grep -iE 'EMAIL|SMTP|OTP|error|send-register' | tail -40"
        )
    )


if __name__ == "__main__":
    main()
