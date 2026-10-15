import paramiko
import sys
import json

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("45.93.136.64", username="root", password="Sarment-123#", timeout=30, look_for_keys=False, allow_agent=False)

def run(cmd, timeout=60):
    print(f"\n$ {cmd}")
    _i, o, e = c.exec_command(cmd, timeout=timeout, get_pty=True)
    text = (o.read() + e.read()).decode("utf-8", errors="replace")
    print(text[-6000:] if len(text) > 6000 else text)

run("curl -sS 'http://127.0.0.1:3000/api/v1/posts?limit=5'")
run("curl -sS 'http://127.0.0.1:3000/api/v1/products?limit=5'")
run("curl -sS 'http://127.0.0.1:3000/api/v1/properties?limit=5'")
run("docker exec backend-db-1 psql -U studhub -d studhub -c 'SELECT COUNT(*) AS posts FROM \"FeedPost\"; SELECT COUNT(*) AS products FROM \"Product\"; SELECT COUNT(*) AS users FROM \"User\";'")
run("pm2 logs studhub-api --lines 80 --nostream | grep -E 'posts|WS |conversation|error|Error' | tail -40")
c.close()
