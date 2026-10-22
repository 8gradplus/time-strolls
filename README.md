<img src="frontend/public/logo.svg" alt="Time Strolls logo" width="140" />

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
- **Production:** publish a GitHub release (tag `vX.Y.Z`). `.github/workflows/release.yml` builds the API and frontend images, pushes them to the DigitalOcean registry and deploys that version to the droplet. Rollback: run the workflow by hand with an earlier tag. Passwords and keys are repository secrets; see `CLAUDE.md`, Deployment.
- **Local stack:** `make run` in `deployment/` (`docker compose up -d --build`; the override builds from source). Passwords and keys in `deployment/.env` (git-ignored). The site is at `http://localhost`.
- **Local API development:** start the stack, stop the `api` service, then `make run-api` in `backend/`.
- **Content:** `replay/places.yml`, replayed through the API with `make local` / `make production` in `replay/`.

### Content Sources
- Topothek
- https://www.znicenekostely.cz/objekt/detail/13352
- https://www.zanikleobce.cz/

