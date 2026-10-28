# syntax=docker/dockerfile:1.7
# Build context: repository root.
# Angular 22 needs Node 22.22.3 or later.
FROM node:22.23-alpine AS build
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
# The entrypoint renders /etc/nginx/templates/*.template into conf.d, substituting only
# variables that are set in the environment (so nginx's own $host etc. are left alone).
ENV API_UPSTREAM=http://api:3000
COPY infrastructure/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/web/dist/web/browser /usr/share/nginx/html
EXPOSE 8080
