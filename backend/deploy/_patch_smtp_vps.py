"""Patch VPS .env with VicciSmart SMTP and restart studhub-api."""
from __future__ import annotations

import re
import sys

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "45.93.136.64"
USER = "root"
PASSWORD = "Sarment-123#"
ENV_PATH = "/opt/studhub/backend/.env"

SMTP_VARS = {
    "SMTP_HOST": "ssl0.ovh.net",
    "SMTP_PORT": "465",
    "SMTP_SECURE": "true",
    "SMTP_USER": "contact@viccismart-enr.com",
    "SMTP_PASS": "12345678K",
    "EMAIL_FROM": "contact@viccismart-enr.com",
    "EMAIL_FROM_NAME": "StudHub",
    "SUPPORT_INBOX": "contact@viccismart-enr.com",
    "EMAIL_CONSOLE_FALLBACK": "false",
    "EMAIL_RESET_TTL_MINUTES": "10",
}


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 90) -> str:
    _i, o, e = client.exec_command(cmd, timeout=timeout, get_pty=True)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


def main() -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        HOST,
        username=USER,
        password=PASSWORD,
        timeout=45,
        look_for_keys=False,
        allow_agent=False,
    )

    raw = run(client, f"cat {ENV_PATH}")
    lines: list[str] = []
    for line in raw.splitlines():
        s = line.rstrip("\r")
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", s.strip()) or (
            lines and (s.strip().startswith("#") or s.strip() == "")
        ):
            lines.append(s)

    text = "\n".join(lines)
    if text and not text.endswith("\n"):
        text += "\n"

    for key, val in SMTP_VARS.items():
        pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
        new_line = f'{key}="{val}"'
        if pattern.search(text):
            text = pattern.sub(new_line, text)
        else:
            text += new_line + "\n"

    sftp = client.open_sftp()
    with sftp.file(ENV_PATH, "w") as f:
        f.write(text)
    sftp.close()
    print("ENV updated with SMTP VicciSmart")

    check = run(
        client,
        f"grep -E '^(SMTP_|EMAIL_|SUPPORT_)' {ENV_PATH} | sed 's/PASS=.*/PASS=***/'",
    )
    print(check)

    print(run(client, "pm2 restart studhub-api --update-env"))
    print(run(client, "sleep 3; pm2 logs studhub-api --lines 50 --nostream | tail -60"))
    client.close()
    print("DONE")


if __name__ == "__main__":
    main()
