import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("45.93.136.64", username="root", password="Sarment-123#", timeout=30, look_for_keys=False, allow_agent=False)

def run(cmd):
    print(f"$ {cmd}")
    _i, o, e = c.exec_command(cmd, timeout=30, get_pty=True)
    print((o.read() + e.read()).decode("utf-8", errors="replace"))

run("curl -sS http://127.0.0.1:3000/health; echo; curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/health; echo; curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/v1/health; echo; pm2 logs studhub-api --lines 30 --nostream")
c.close()
