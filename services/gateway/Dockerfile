FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN --mount=type=cache,id=football-verse-npm,target=/root/.npm \
    for attempt in 1 2 3; do \
      npm ci --no-audit --no-fund --prefer-offline \
        && test -x node_modules/.bin/tsc && exit 0; \
      rm -rf node_modules; sleep 3; \
    done; exit 1

COPY src/ ./src/
RUN npm run build

FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,id=football-verse-npm,target=/root/.npm \
    for attempt in 1 2 3; do \
      npm ci --omit=dev --no-audit --no-fund --prefer-offline \
        && test -f node_modules/express/package.json && exit 0; \
      rm -rf node_modules; sleep 3; \
    done; exit 1

COPY --from=builder /app/dist ./dist

EXPOSE 8000

CMD ["node", "dist/server.js"]
