# API Documentation
Comes with fastapi and is available under

### Production
- `https://timestrolls.debtray.com/api/docs`
- `https://timestrolls.debtray.com/api/openapi.json`
- `https://timestrolls.debtray.com/api/redoc`

### Locally running api
- `http://localhost:8000/api/docs`
- `http://localhost:8000/api/openapi.json`
- `http://localhost:8000/api/redoc`

# Deployment
### Docker compose
- Configs are in the `deployment` folder.
- We use docker compose together with overrides.
- The base docker compose is given for live Deployment
- `docker-compose.overrides.yml` injects settings for local deployment (Caddyfile and port mapping)

### Deployment remark
- Currently we don't use a docker registry (money constraints)
- This should be done in the future.
- So in essence we clone the git repo on the server
- check docker compose env after interpolation `docker compose --env-file credentials.local config`

### Live Docker
- Just use docker compose (no override)
- `docker compose -f docker-compose.yml --env-file credentials.local up --build`
- Needs `credentials.prod` ENV file
- Run `deploy_production.sh` for digital ocean deployment.

### Local Docker
- Uses overrides (no need for -f flag).
- `docker compose --env-file credentials.local up --build`
- Needs `credentials.local` ENV file.

### Local api development
Upon development we don't always want to inspect api changes via docker but from a local development server
1. Start postgres from home
  - `docker compose --env-file credentials.local up --build`
2. Stop unnecessary services
3. Run API development server
  - `cd backend`
  - `make run-api`
