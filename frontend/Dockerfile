# Build stage
FROM node:16-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --if-present

# Production stage
# Production stage
FROM node:16-slim AS runner
WORKDIR /app

# Only install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built output from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src


EXPOSE 3000
CMD ["npm", "start"]
