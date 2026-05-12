FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_SHADEMAP_API_KEY
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_BACKEND_URL

ENV VITE_SHADEMAP_API_KEY=$VITE_SHADEMAP_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend/ ./

RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY dockerfiles/frontend.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
