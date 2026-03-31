# Webmail Pro

Professional multi-account webmail manager built with Angular, Node.js, and PostgreSQL.

## Deployment & Setup

### Requirements
- Docker & Docker Compose
- Traefik (running on the host with `traefik` network)
- `mkcert` for local SSL

### Local Development
1. Clone the repository.
2. Create certificates: `cd /home/alphaws/Dev/tools/traefik/certs && mkcert webmail.localhost`
3. Add to Traefik `dynamic.yml`.
4. Run: `docker compose up -d --build`
5. Access via: [https://webmail.localhost](https://webmail.localhost)

## Git Deployment Workflow

1.  **Local Changes:** Make your changes locally.
2.  **Commit & Push:**
    ```bash
    git add .
    git commit -m "Your description"
    git push origin main
    ```
3.  **Deploy to Production:**
    ```bash
    ssh alphaws@prstart.hu "cd /var/www/webmail && git pull origin main && docker compose up -d --build"
    ```

## Master User
- Default: `admin` / `REDACTED_USE_ENV`

## Tech Stack
- **Frontend:** Angular 17 (TypeScript)
- **Backend:** Node.js (Express + ts-node)
- **Database:** PostgreSQL 16
- **Routing:** Traefik + SSL (mkcert)
