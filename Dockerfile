# Build the Astro static site, serve it with nginx.
# nginx also proxies /api/* to the backend service over Northflank's
# internal project network, so the app and API share one origin
# (no CORS, and the HttpOnly refresh cookie stays first-party).
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm install (not ci): Astro's wasm optional deps resolve per-platform and
# can desync the lockfile across build hosts.
RUN npm install --no-audit --no-fund
COPY . .
# Empty base URL → the app calls /api/*, handled by the proxy below.
ENV VITE_API_BASE_URL=
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# Backend service name inside the Northflank project network (override per deploy).
ENV BACKEND_UPSTREAM=watchtrading-back:8080
EXPOSE 8080
CMD ["sh", "-c", "envsubst '$$BACKEND_UPSTREAM' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
