FROM node:20-alpine AS frontend_builder

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

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend_builder /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
