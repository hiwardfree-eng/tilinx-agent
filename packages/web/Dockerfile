# Serves the pre-built TilinX Cloud web SPA over HTTP (port 8080, non-root nginx).
# The SPA's config is baked at BUILD time, so build dist first:
#   VITE_CONTROL_PLANE_URL=http://<cp-ip> \
#   FIREBASE_API_KEY=<web-api-key> \
#   FIREBASE_AUTH_DOMAIN=gettilinx.firebaseapp.com \
#   FIREBASE_PROJECT_ID=gettilinx \
#   SENTRY_DSN=<tilinx-app DSN> \
#     pnpm --filter tilinx-web build
# (SENTRY_DSN powers browser crash reporting; "Send feedback" needs the
#  control plane's CP_LINEAR_API_KEY/CP_LINEAR_TEAM_ID — see cloud/k8s.)
# then, from packages/web:
#   gcloud builds submit --tag <REGION>-docker.pkg.dev/<PROJECT>/<REPO>/web:v1 .
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
EXPOSE 8080
