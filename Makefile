# Loquor — project tasks
#
# Stack: Vite + React + TypeScript, Vitest (test/coverage), ESLint (lint),
# Prettier (format). Targets call tools via `npx`. Run `make install` first.

.DEFAULT_GOAL := help
.PHONY: all install ensure-deps dev build preview typecheck test cover lint format loc extract-vocab help

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
	# `tsc -b` (build mode) is required: the root tsconfig is solution-style
	# (files:[] + references), and references are only followed in build mode.
	# Plain `tsc --noEmit` here would type-check NOTHING.
	npx tsc -b

test: ## Run the full test suite (one-shot)
	npx vitest run

cover: ## Generate a code coverage report (one-shot)
	npx vitest run --coverage

lint: ## Lint with autofix (ESLint)
	npx eslint . --fix

format: ## Format code (Prettier)
	npx prettier --write .

# Lines of code for what we've built. Tests are co-located `*.test.ts(x)` files
# under src/, so "src" means implementation only and "tests" the rest. Uses
# `cat | wc -l` (not `wc -l file...`) so a no-match find pipes empty → prints 0
# instead of `wc` blocking on stdin; portable across GNU and BSD userlands.
loc: ## Count lines of code (src implementation and tests)
	@printf '  %-12s %7s lines  %3s files\n' \
		'src:'   "$$(find src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) ! -name '*.test.ts' ! -name '*.test.tsx' -exec cat {} + | wc -l | tr -d ' ')" \
		         "$$(find src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) ! -name '*.test.ts' ! -name '*.test.tsx' | wc -l | tr -d ' ')"; \
	printf '  %-12s %7s lines  %3s files\n' \
		'tests:' "$$(find src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -exec cat {} + | wc -l | tr -d ' ')" \
		         "$$(find src -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) | wc -l | tr -d ' ')"; \
	printf '  %-12s %7s lines  %3s files\n' \
		'total:' "$$(find src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -exec cat {} + | wc -l | tr -d ' ')" \
		         "$$(find src -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) | wc -l | tr -d ' ')"

extract-vocab: ## Regenerate src/llm/grammar/zork{1,2,3}.vocab.ts from the vendored ZIL
	node scripts/extract-vocab.mjs

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'
