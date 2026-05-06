SHELL := /bin/zsh

FRONTEND_DIR := frontend
DOCKERFILE := dockerfiles/frontend.Dockerfile

IMAGE_NAME ?= map-frontend
CONTAINER_NAME ?= map-frontend
PORT ?= 5173
PROD_SSH ?= bekzhan@77.42.43.153

.PHONY: help install dev build ssh-prod prod-build prod-run prod-stop prod-rm prod-restart prod-logs prod-status prod-deploy

help:
	@echo "Available targets:"
	@echo "  make install                      Install frontend dependencies"
	@echo "  make dev                          Run frontend in dev mode"
	@echo "  make build                        Build frontend locally"
	@echo "  make ssh-prod                     SSH into production server"
	@echo "  make prod-build                   Build frontend Docker image from frontend/.env"
	@echo "  make prod-run                     Run production container on port $(PORT)"
	@echo "  make prod-stop                    Stop production container"
	@echo "  make prod-rm                      Remove production container"
	@echo "  make prod-restart                 Recreate production container"
	@echo "  make prod-logs                    Tail production logs"
	@echo "  make prod-status                  Show production container status"
	@echo "  make prod-deploy                  Build and restart production container"

install:
	npm install --prefix $(FRONTEND_DIR)

dev:
	npm run dev --prefix $(FRONTEND_DIR)

build:
	npm run build --prefix $(FRONTEND_DIR)

ssh-prod:
	ssh $(PROD_SSH)

prod-build:
	@test -f $(FRONTEND_DIR)/.env || (echo "$(FRONTEND_DIR)/.env is required"; exit 1)
	@grep -q '^VITE_SHADEMAP_API_KEY=' $(FRONTEND_DIR)/.env || (echo "VITE_SHADEMAP_API_KEY is missing in $(FRONTEND_DIR)/.env"; exit 1)
	docker build -f $(DOCKERFILE) -t $(IMAGE_NAME):latest .

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
