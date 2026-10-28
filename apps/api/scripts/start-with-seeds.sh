#!/bin/sh
# Start command for hosts without a shell or one-off jobs (for example Render's free tier).
# Runs the idempotent seeds, then replaces itself with the API server:
#   - verified crisis contacts (always; inserts only missing entries)
#   - the first admin, only when ADMIN_EMAIL and ADMIN_PASSWORD are set (skipped if it exists)
#   - synthetic demo accounts, only when DEMO_SEED=true (refused when NODE_ENV=production)
# A failing seed is logged but does not stop the API from starting.
set -u

node dist/cli/seed-crisis-resources.js || echo "seed-crisis-resources failed; continuing"

if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  node dist/cli/seed-admin.js --email "$ADMIN_EMAIL" --name "${ADMIN_NAME:-Administrator}" || echo "seed-admin did not create an account; continuing"
fi

if [ "${DEMO_SEED:-false}" = "true" ]; then
  node dist/cli/seed-dev.js --yes || echo "seed-dev failed; continuing"
fi

exec node dist/main.js
