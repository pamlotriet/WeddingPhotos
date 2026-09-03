# Build with a Node version supported by Angular CLI 22.
FROM node:24.17.0-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/wedding-gallery/browser /usr/share/nginx/html
EXPOSE 80
