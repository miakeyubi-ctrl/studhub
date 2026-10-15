import paramiko
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

host = "45.93.136.64"
password = "Sarment-123#"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username="root", password=password, timeout=30, look_for_keys=False, allow_agent=False)


def run(cmd, timeout=120):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    text = (stdout.read() + stderr.read()).decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if text.strip():
        print(text[-6000:] if len(text) > 6000 else text)
    print(f"[exit {code}]")
    return code, text


print("Connected to", host)
run("uname -a; hostname; free -h | head -2; df -h / | tail -1")
run("node -v; npm -v; pm2 -v || echo 'no-pm2'")
run("pm2 list || true")
run("ls -la /opt /root 2>/dev/null | head -50")
run("ls -la /opt/studhub /root/studhub /var/www/studhub 2>/dev/null || echo 'no-studhub-dir'")
run("ss -tlnp | head -40")
run("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo 'no-docker'")

client.close()
