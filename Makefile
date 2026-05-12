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

.PHONY: help install dev dev-frontend dev-backend build ssh-prod \
        prod-build prod-run prod-stop prod-rm prod-restart prod-logs prod-status prod-deploy \
        db-up db-down app-up app-down app-logs prod-up prod-down

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
