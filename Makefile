SHELL := /bin/sh

FRONTEND_DIR := frontend
BACKEND_DIR := backend
DOCKERFILE_FRONTEND := dockerfiles/frontend.Dockerfile
DOCKERFILE_BACKEND := dockerfiles/backend.Dockerfile

IMAGE_NAME ?= map-frontend
CONTAINER_NAME ?= map-frontend
PORT ?= 5173
PROD_SSH ?= bekzhan@77.42.43.153
ENV ?= dev
DOMAIN ?= oylan.me
CERTBOT_EMAIL ?= admin@oylan.me

.PHONY: help install dev dev-frontend dev-backend build ssh-prod \
        prod-build prod-run prod-stop prod-rm prod-restart prod-logs prod-status prod-deploy \
        db-up db-down app-up app-down app-logs prod-up prod-down \
        ssl-init ssl-up ssl-down ssl-logs ssl-renew ssl-cert-status

help:
	@echo "Available targets:"
	@echo ""
	@echo "  ── Local dev ──────────────────────────────────────────────"
	@echo "  make install                      Install frontend dependencies"
	@echo "  make dev                          Run frontend + backend locally"
	@echo "  make dev-frontend                 Run frontend only (port 5173)"
	@echo "  make dev-backend                  Run backend only (port 8003)"
	@echo "  make build                        Build frontend locally"
	@echo ""
	@echo "  ── Docker (backend + db) ──────────────────────────────────"
	@echo "  make db-up                        Start postgres (ENV=dev|prod)"
	@echo "  make db-down                      Stop postgres"
	@echo "  make app-up                       Start postgres + backend (ENV=dev|prod)"
	@echo "  make app-down                     Stop postgres + backend"
	@echo "  make app-logs                     Tail logs for postgres + backend"
	@echo "  make prod-up                      app-up with ENV=prod"
	@echo "  make prod-down                    app-down with ENV=prod"
	@echo ""
	@echo "  ── Docker (frontend) ──────────────────────────────────────"
	@echo "  make prod-build                   Build frontend Docker image"
	@echo "  make prod-run                     Run frontend container (port $(PORT))"
	@echo "  make prod-stop                    Stop frontend container"
	@echo "  make prod-rm                      Remove frontend container"
	@echo "  make prod-restart                 Recreate frontend container"
	@echo "  make prod-logs                    Tail frontend container logs"
	@echo "  make prod-status                  Show frontend container status"
	@echo "  make prod-deploy                  Build and restart frontend container"
	@echo ""
	@echo "  ── SSL / Domain (oylan.me) ─────────────────────────────────"
	@echo "  make ssl-init DOMAIN=oylan.me CERTBOT_EMAIL=mail@oylan.me"
	@echo "                                     Issue Let's Encrypt cert (first run)"
	@echo "  make ssl-up                       Start backend+nginx(80/443)"
	@echo "  make ssl-down                     Stop stack including nginx"
	@echo "  make ssl-logs                     Tail nginx logs"
	@echo "  make ssl-renew                    Renew certificates and reload nginx"
	@echo "  make ssl-cert-status              Show installed certificates"
	@echo ""
	@echo "  ── Server ─────────────────────────────────────────────────"
	@echo "  make ssh-prod                     SSH into production server"


install:
	npm install --prefix $(FRONTEND_DIR)

dev: dev-frontend dev-backend

dev-frontend:
	npm run dev --prefix $(FRONTEND_DIR)

dev-backend:
	cd $(BACKEND_DIR) && uv run uvicorn main:app --host 0.0.0.0 --port 8003 --reload

build:
	npm run build --prefix $(FRONTEND_DIR)

ssh-prod:
	ssh $(PROD_SSH)


prod-build:
	@test -f envs/$(ENV).env || (echo "envs/$(ENV).env is required"; exit 1)
	docker build -f $(DOCKERFILE_FRONTEND) \
		--build-arg VITE_SHADEMAP_API_KEY=$$(grep '^VITE_SHADEMAP_API_KEY=' envs/$(ENV).env | cut -d= -f2) \
		--build-arg VITE_GOOGLE_MAPS_API_KEY=$$(grep '^VITE_GOOGLE_MAPS_API_KEY=' envs/$(ENV).env | cut -d= -f2) \
		--build-arg VITE_BACKEND_URL=$$(grep '^VITE_BACKEND_URL=' envs/$(ENV).env | cut -d= -f2) \
		-t $(IMAGE_NAME):latest .

prod-run:
	docker run -d --name $(CONTAINER_NAME) -p $(PORT):5173 --restart unless-stopped $(IMAGE_NAME):latest

prod-stop:
	-docker stop $(CONTAINER_NAME)

prod-rm:
	-docker rm -f $(CONTAINER_NAME)

prod-restart: prod-rm
	docker run -d --name $(CONTAINER_NAME) -p $(PORT):5173 --restart unless-stopped $(IMAGE_NAME):latest

prod-logs:
	docker logs -f $(CONTAINER_NAME)

prod-status:
	docker ps --filter name=$(CONTAINER_NAME)

prod-deploy: prod-build prod-restart


db-up:
	docker compose -f docker-compose/postgres.yml --env-file envs/$(ENV).env up -d

db-down:
	docker compose -f docker-compose/postgres.yml --env-file envs/$(ENV).env down

app-up:
	docker compose -f docker-compose/app.yml --env-file envs/$(ENV).env up -d --build

app-down:
	docker compose -f docker-compose/app.yml --env-file envs/$(ENV).env down

app-logs:
	docker compose -f docker-compose/app.yml logs -f

prod-up:
	ENV=prod $(MAKE) app-up

prod-down:
	ENV=prod $(MAKE) app-down

ssl-init:
	@mkdir -p certbot/conf certbot/www
	-docker compose -f docker-compose/app.yml --env-file envs/$(ENV).env --profile edge stop nginx
	docker compose -f docker-compose/app.yml --env-file envs/$(ENV).env --profile certbot run --rm --service-ports certbot \
		certonly --standalone --preferred-challenges http \
		--agree-tos --no-eff-email --email $(CERTBOT_EMAIL) \
		-d $(DOMAIN) -d www.$(DOMAIN)

ssl-up:
	docker compose -f docker-compose/app.yml --env-file envs/$(ENV).env --profile edge up -d --build backend nginx

ssl-down:
	docker compose -f docker-compose/app.yml --env-file envs/$(ENV).env --profile edge down

ssl-logs:
	docker compose -f docker-compose/app.yml --env-file envs/$(ENV).env --profile edge logs -f nginx

ssl-renew:
	docker compose -f docker-compose/app.yml --env-file envs/$(ENV).env --profile certbot run --rm certbot \
		renew --webroot -w /var/www/certbot
	-docker compose -f docker-compose/app.yml --env-file envs/$(ENV).env --profile edge exec nginx nginx -s reload

ssl-cert-status:
	docker compose -f docker-compose/app.yml --env-file envs/$(ENV).env --profile certbot run --rm certbot certificates
