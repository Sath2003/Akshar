# EC2 Deployment Guide

This guide documents deploying Akshar on a single AWS EC2 instance (Ubuntu 22.04 LTS).

---

## Prerequisites

- An EC2 instance (t3.small or larger recommended)
- An Elastic IP assigned to the instance
- Domain `sathvikdevops.online` A record pointing to the Elastic IP
- An S3 bucket for audio assets
- An EC2 IAM role with `s3:GetObject` on the audio prefix
- A Gemini API key (from https://aistudio.google.com/app/apikey)

---

## 1. DNS A Record

In your domain registrar, create:

```
Type:  A
Name:  @  (apex domain)
Value: <EC2 Elastic IP>
TTL:   300
```

Wait for DNS propagation (5–30 minutes) before running certbot.

---

## 2. EC2 Security Group Rules

Open **only** these inbound rules:

| Port | Protocol | Source             | Purpose                    |
|------|----------|--------------------|----------------------------|
| 22   | TCP      | Your IP only       | SSH access                 |
| 80   | TCP      | 0.0.0.0/0, ::/0   | HTTP (redirects to HTTPS)  |
| 443  | TCP      | 0.0.0.0/0, ::/0   | HTTPS                      |

**Do not open:** 4000 (backend), 5432 (PostgreSQL), 5050 (pgAdmin)

---

## 3. Install Docker on EC2

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 4. Clone Repository

```bash
cd /home/ubuntu
git clone https://github.com/Sath2003/Akshar.git
cd Akshar
```

---

## 5. Create .env

```bash
cp .env.example .env
nano .env
```

Fill in every placeholder. Never use `change-me` or `replace-with-strong-password` in production.

Generate secrets:

```bash
# Strong DB password
openssl rand -base64 24

# CSRF secret (for future auth phase)
openssl rand -hex 32
```

---

## 6. Initialize SSL and Start Stack

```bash
chmod +x scripts/init-ssl.sh scripts/renew-ssl.sh
./scripts/init-ssl.sh
```

This script:
1. Validates `APP_DOMAIN` and `LETSENCRYPT_EMAIL`
2. Renders bootstrap nginx config (HTTP-only)
3. Starts nginx on port 80
4. Runs certbot webroot challenge
5. Issues Let's Encrypt certificate
6. Renders production HTTPS nginx config
7. Reloads nginx
8. Starts the full stack

---

## 7. Health Checks

```bash
# All containers should be Up
docker compose ps

# Backend health
curl https://sathvikdevops.online/api/v1/health

# HTTP should redirect to HTTPS
curl -I http://sathvikdevops.online
```

---

## 8. View Logs

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f nginx
```

---

## 9. Enable pgAdmin (Optional)

```bash
docker compose --profile tools up -d pgadmin
# Access ONLY from your machine via SSH tunnel:
ssh -L 5050:127.0.0.1:5050 ubuntu@<EC2-IP>
# Then open http://localhost:5050 in your browser
```

**Never expose port 5050 publicly.**

---

## 10. Database Backup

```bash
docker compose exec postgres pg_dump -U education education \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## 11. Certificate Renewal

Add to crontab (`sudo crontab -e`):

```cron
0 3 * * * cd /home/ubuntu/Akshar && ./scripts/renew-ssl.sh >> /var/log/akshar-certbot.log 2>&1
```

Manual renewal test:

```bash
./scripts/renew-ssl.sh
```

---

## 12. Updating the Application

```bash
cd /home/ubuntu/Akshar
git pull origin main
docker compose build
docker compose up -d
docker compose ps
```

---

## 13. Rollback

```bash
git log --oneline -10
git checkout <commit-hash>
docker compose build
docker compose up -d
```

---

## 14. EC2 IAM Role Requirements

The EC2 instance profile must include:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::<your-bucket>/audio/*"
    }
  ]
}
```

Do not add `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` to `.env`. The AWS SDK uses the instance metadata service automatically.
