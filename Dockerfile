# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Build app
COPY . .
ARG BASE_HREF=/legacy/
RUN npm run build -- --configuration production --base-href=${BASE_HREF} --deploy-url=${BASE_HREF}

# ---------- Runtime stage ----------
FROM nginx:alpine

# Use the dedicated Nginx config for the legacy frontend
COPY nginx.conf /etc/nginx/nginx.conf

# App files
# NOTE: adjust the path below if your Angular output dir differs
COPY --from=build /app/dist/tradingview-angular-app /usr/share/nginx/html

EXPOSE 80

# Optional healthcheck for Compose
HEALTHCHECK --interval=10s --timeout=3s --retries=10 \
    CMD wget -q -O - http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
