FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS builder

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

FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,id=football-verse-npm,target=/root/.npm \
    for attempt in 1 2 3; do \
      npm ci --omit=dev --no-audit --no-fund --prefer-offline \
        && test -f node_modules/express/package.json && exit 0; \
      rm -rf node_modules; sleep 3; \
    done; exit 1

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 8000

CMD ["node", "dist/server.js"]
