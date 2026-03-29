# Frontend Deploy Plan: Docker + Nginx on Port 5173

## Goal

Deploy only the frontend to a server without a domain and without HTTPS.

The frontend will:

- be built with Vite
- run inside Docker
- be served by Nginx
- be available by server IP on port `5173`

Example URL:

```text
http://<SERVER_IP>:5173
```

## Current Project Assumptions

- Frontend source lives in `frontend/`
- Production build output is `frontend/dist`
- Required frontend env:

```env
VITE_SHADEMAP_API_KEY=...
```

- The app is currently a single-entry Vite app, so Nginx can serve static files directly

## Files Added for Deploy

- `dockerfiles/frontend.Dockerfile`
- `dockerfiles/frontend.nginx.conf`

## Deploy Strategy

### 1. Prepare the server

Server should have:

- Docker installed
- port `5173` open in firewall/security group

### 2. Build the frontend Docker image

From the project root:

```bash
docker build \
  -f dockerfiles/frontend.Dockerfile \
  --build-arg VITE_SHADEMAP_API_KEY=YOUR_REAL_KEY \
  -t map-frontend:latest \
  .
```

Important:

- `VITE_` variables are embedded at build time by Vite
- if the key changes, the image must be rebuilt

### 3. Run the container

```bash
docker run -d \
  --name map-frontend \
  -p 5173:5173 \
  --restart unless-stopped \
  map-frontend:latest
```

After this, the frontend should be reachable at:

```text
http://SERVER_IP:5173
```

### 4. Verify after startup

Check that:

- container is running
- Nginx responds on port `5173`
- JS/CSS assets load correctly
- the map opens in browser
- ShadeMap requests work with the provided API key

Useful commands:

```bash
docker ps
docker logs map-frontend
curl http://127.0.0.1:5173
```

## Update Process

When frontend code changes:

1. Pull latest code on the server
2. Rebuild the image
3. Recreate the container

Commands:

```bash
docker build \
  -f dockerfiles/frontend.Dockerfile \
  --build-arg VITE_SHADEMAP_API_KEY=YOUR_REAL_KEY \
  -t map-frontend:latest \
  .

docker rm -f map-frontend

docker run -d \
  --name map-frontend \
  -p 5173:5173 \
  --restart unless-stopped \
  map-frontend:latest
```

## Notes

- No domain is needed for this setup
- No HTTPS is included in this first stage
- Nginx is configured to serve on internal container port `5173`
- The app is exposed on host port `5173:5173`
- `try_files` is enabled in Nginx so SPA routing will still work if routes are added later

## Next Step After First Deploy

Once the frontend is reachable and stable, the next improvements can be:

1. add a domain
2. move to `80/443`
3. enable HTTPS with Let's Encrypt
4. add CI/CD or a simple deploy script
