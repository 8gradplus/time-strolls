# Frontend

React 19 + Vite + react-leaflet.

## Scripts

- `npm start`: dev server on http://localhost:3000
- `npm test`: Vitest in watch mode (`npx vitest run` for a single run)
- `npm run build`: production build into `build/`
- `npm run format` / `npm run format:check`: Prettier

## API proxy

The dev server proxies `/api` to production (`https://timestrolls.debtray.com`).
To use a locally running API:

```sh
API_PROXY=http://127.0.0.1:8000 npm start
```

## Testing on a mobile phone

1. Run the frontend: `npm start`
2. Create a tunnel with localtunnel: `lt --port 3000`
3. Open the printed address (the password is your public IP: `curl https://loca.lt/mytunnelpassword`)

## Docker

The image builds the app and serves the static files with Caddy on port 3000
(see `Caddyfile`). The outer Caddy in `deployment/` proxies to it.
