FROM node:16 as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .
#RUN npm run ci
RUN npm run build --

FROM caddy:2.6.2-alpine

# Copy built files from previous stage into Caddy's web root
COPY --from=build /app/build /usr/share/caddy

# Optional: Custom Caddyfile (uncomment if you have one)
COPY Caddyfile /etc/caddy/Caddyfile

# Expose port (Caddy defaults to 80)
EXPOSE 80
