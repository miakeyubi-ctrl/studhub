import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(
    "45.93.136.64",
    username="root",
    password="Sarment-123#",
    timeout=30,
    look_for_keys=False,
    allow_agent=False,
)


def run(cmd, timeout=90):
    print(f"\n$ {cmd}")
    _i, o, e = c.exec_command(cmd, timeout=timeout, get_pty=True)
    text = (o.read() + e.read()).decode("utf-8", errors="replace")
    print(text[-8000:] if len(text) > 8000 else text)


run("find /opt/studhub -type f | head -80")
run("cat /opt/studhub/README.txt")
run("for f in /opt/studhub/backend/* /opt/studhub/deploy/*; do echo ===== $f =====; cat \"$f\" 2>/dev/null | head -80; done")
run("docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'")
run("ls /opt/*/docker-compose*.yml /root/*/docker-compose*.yml 2>/dev/null; find / -name 'docker-compose*.yml' 2>/dev/null | head -20")
run("cat /etc/caddy/Caddyfile 2>/dev/null || find / -name Caddyfile 2>/dev/null | head -5 | while read f; do echo ===== $f =====; cat \"$f\"; done")

c.close()
