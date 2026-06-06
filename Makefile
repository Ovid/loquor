# Naitfol — project tasks
#
# Stack: Vite + React + TypeScript, Vitest (test/coverage), ESLint (lint),
# Prettier (format). Targets call tools via `npx`. Run `make install` first.

.DEFAULT_GOAL := help
.PHONY: all install ensure-deps dev build preview typecheck test cover lint format help

all: lint format typecheck test ## Full CI pass: lint, format, typecheck, test

install: ## Install dependencies (clean, lockfile-exact)
	npm ci

# Guard run before any Vite target. Reinstalls (clean `npm ci`) when node_modules
# is missing, is stale relative to the lockfile, or can't load Rolldown's native
# binding for THIS platform — the case that bit us on macOS, where npm's
# optional-deps bug (npm/cli#4828) left a partial tree without
# @rolldown/binding-darwin-arm64. The binding check asks Node to actually load
# Rolldown, so it resolves the exact OS/arch/libc binding Vite uses at runtime —
# correct everywhere without a hard-coded platform table, and ~0.1s when healthy.
# Healthy installs are a silent no-op; it only speaks up when it has to reinstall.
ensure-deps:
	@if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then \
		echo ">> deps missing or older than the lockfile — running npm ci"; npm ci; \
	elif ! node -e "import('rolldown').then(() => process.exit(0), () => process.exit(1))" >/dev/null 2>&1; then \
		echo ">> Rolldown native binding for $$(uname -s)/$$(uname -m) not loadable (npm/cli#4828) — running npm ci"; npm ci; \
	fi

dev: ensure-deps ## Run the dev server (Vite)
	npx vite

build: ensure-deps typecheck ## Type-check then build for production
	npx vite build

preview: ensure-deps ## Preview the production build locally
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
