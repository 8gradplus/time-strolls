# Deployment

Currently we don't use a docker registry (money constraints)
This should be done in the future.
So in essence we clone the git repo on the server

### Live
- ssh into droplet
- run `deploy_production.sh`
- uses configs as set up in the `deployment` folder

### Local docker
- `docker compose up`
- Still BUGGY!
- PgAdmin usage: uncomment port mapping for postgres service
  - Todo make two dockercompose(?)


### Local api development
Upon development we don't always want to inspect api changes via docker but from a local development server
1. Start postgres from home
  - `docker compose up -d`
2. Run API development server
  - `cd backend`
  - `make run-api`

- Use the configs as set up in `backend/config.yml`
