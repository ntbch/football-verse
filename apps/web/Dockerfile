FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS build
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,id=football-verse-npm,target=/root/.npm \
    for attempt in 1 2 3; do \
      npm ci --no-audit --no-fund --prefer-offline \
        && test -x node_modules/.bin/next && exit 0; \
      rm -rf node_modules; sleep 3; \
    done; exit 1
COPY . .
RUN npm run build

FROM node:26-alpine@sha256:e88a35be04478413b7c71c455cd9865de9b9360e1f43456be5951032d7ac1a66 AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone build and static files
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
