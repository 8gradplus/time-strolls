# Build stage
FROM node:24-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve the static build on :3000; the outer Caddy proxies to it.
# Pinned like the outer proxy: caddy 2.11.7 (caddy:2-alpine in Oct 2026)
# crashed on startup while loading its root certificates
FROM caddy:2.6.2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/build /srv
EXPOSE 3000
