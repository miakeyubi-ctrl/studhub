import paramiko
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("45.93.136.64", username="root", password="Sarment-123#", timeout=30, look_for_keys=False, allow_agent=False)

def run(cmd):
    print(f"\n$ {cmd}")
    _i, o, e = c.exec_command(cmd, timeout=60, get_pty=True)
    print((o.read() + e.read()).decode("utf-8", errors="replace")[-5000:])

run("curl -sS -X POST http://127.0.0.1:3000/api/v1/auth/send-register-otp -H 'Content-Type: application/json' -d '{\"email\":\"test.otp@example.com\"}'")
run("pm2 logs studhub-api --lines 40 --nostream | tail -60")
run("redis-cli -h 127.0.0.1 ping; docker exec backend-redis-1 redis-cli ping")
c.close()
