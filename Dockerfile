# Build stage: clean npm ci, then typecheck and produce the static Vite build.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage: serve dist/ with nginx. EXPOSE 80 keeps the image probeable
# (curl http://localhost/); no HEALTHCHECK is defined so no extra packages
# are needed.
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
