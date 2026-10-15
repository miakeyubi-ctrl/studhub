import paramiko
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("45.93.136.64", username="root", password="Sarment-123#", timeout=30, look_for_keys=False, allow_agent=False)
cmds = [
    "curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/v1/properties",
    "curl -sS 'http://127.0.0.1:3000/api/v1/properties?limit=1' | head -c 400",
    "curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/docs",
    "curl -sS -o /dev/null -w '%{http_code}' http://45.93.136.64:3000/api/v1/properties",
]
for cmd in cmds:
    print(f"\n$ {cmd}")
    _i, o, e = c.exec_command(cmd, timeout=30, get_pty=True)
    print((o.read() + e.read()).decode("utf-8", errors="replace")[:2000])
c.close()
