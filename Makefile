# Naitfol — project tasks
#
# Stack: Vite + React + TypeScript, Vitest (test/coverage), ESLint (lint),
# Prettier (format). Targets call tools via `npx`. Run `make install` first.

.DEFAULT_GOAL := help
.PHONY: all install dev build preview typecheck test cover lint format help

all: lint format typecheck test ## Full CI pass: lint, format, typecheck, test

install: ## Install dependencies (clean, lockfile-exact)
	npm ci

dev: ## Run the dev server (Vite)
	npx vite

build: typecheck ## Type-check then build for production
	npx vite build

preview: ## Preview the production build locally
	npx vite preview

typecheck: ## Type-check with the TypeScript compiler (no emit)
	npx tsc --noEmit

test: ## Run the full test suite (one-shot)
	npx vitest run

cover: ## Generate a code coverage report (one-shot)
	npx vitest run --coverage

lint: ## Lint with autofix (ESLint)
	npx eslint . --fix

format: ## Format code (Prettier)
	npx prettier --write .

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'
