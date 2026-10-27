# syntax=docker/dockerfile:1.7
# Build context: repository root.
FROM node:22.22-alpine AS build
RUN npm install -g npm@11.21.1
WORKDIR /repo
COPY packages/shared-types/package.json packages/shared-types/package-lock.json packages/shared-types/
RUN cd packages/shared-types && npm ci
COPY packages/shared-types packages/shared-types
RUN cd packages/shared-types && npm run build
COPY apps/web/package.json apps/web/package-lock.json apps/web/
RUN cd apps/web && npm ci
COPY apps/web apps/web
RUN cd apps/web && npm run build -- --configuration production

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY infrastructure/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist/web/browser /usr/share/nginx/html
EXPOSE 8080
