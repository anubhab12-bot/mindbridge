# syntax=docker/dockerfile:1.7
# Build context: repository root (the API depends on packages/shared-types).
FROM node:22.22-alpine AS build
RUN npm install -g npm@11.21.1
WORKDIR /repo
COPY packages/shared-types/package.json packages/shared-types/package-lock.json packages/shared-types/
RUN cd packages/shared-types && npm ci
COPY packages/shared-types packages/shared-types
RUN cd packages/shared-types && npm run build
COPY apps/api/package.json apps/api/package-lock.json apps/api/
RUN cd apps/api && npm ci
COPY apps/api apps/api
RUN cd apps/api && npm run build && npm prune --omit=dev

FROM node:22.22-alpine AS runtime
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /repo/apps/api
COPY --from=build /repo/packages/shared-types/package.json /repo/packages/shared-types/package.json
COPY --from=build /repo/packages/shared-types/dist /repo/packages/shared-types/dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
RUN mkdir -p var/uploads && chown -R app:app var
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1
# The worker uses the same image with: node dist/worker.js
CMD ["node", "dist/main.js"]
