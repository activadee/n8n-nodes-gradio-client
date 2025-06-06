# n8n-nodes-gradio-client Release Makefile

# Get current version from package.json
VERSION := $(shell node -p "require('./package.json').version")

.PHONY: help build release patch minor major clean

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the TypeScript project
	@echo "Building project..."
	npm run build

clean: ## Clean dist directory
	@echo "Cleaning dist directory..."
	rm -rf dist/

patch: ## Bump patch version and release
	@echo "Bumping patch version..."
	npm version patch --no-git-tag-version
	@$(MAKE) release

minor: ## Bump minor version and release
	@echo "Bumping minor version..."
	npm version minor --no-git-tag-version
	@$(MAKE) release

major: ## Bump major version and release
	@echo "Bumping major version..."
	npm version major --no-git-tag-version
	@$(MAKE) release

release: build ## Create full release (tag, GitHub release, npm publish)
	@echo "Creating release for version $(VERSION)..."
	
	# Commit version bump
	git add package.json package-lock.json
	git commit -m "chore: bump version to $(VERSION)" || true
	
	# Create and push git tag
	@echo "Creating git tag v$(VERSION)..."
	git tag v$(VERSION)
	git push origin main --tags
	
	# Create GitHub release
	@echo "Creating GitHub release..."
	gh release create v$(VERSION) \
		--title "Release v$(VERSION)" \
		--notes "Release v$(VERSION) - see CHANGELOG.md for details" \
		--latest
	
	# Publish to npm (this will be handled by GitHub Actions)
	@echo "Release v$(VERSION) created successfully!"
	@echo "GitHub Actions will automatically publish to npm."
	@echo "Check: https://github.com/activadee/n8n-nodes-gradio-client/actions"

release-local: build ## Create release and publish to npm locally (for testing)
	@echo "Creating local release for version $(VERSION)..."
	
	# Commit version bump
	git add package.json package-lock.json
	git commit -m "chore: bump version to $(VERSION)" || true
	
	# Create and push git tag
	git tag v$(VERSION)
	git push origin main --tags
	
	# Create GitHub release
	gh release create v$(VERSION) \
		--title "Release v$(VERSION)" \
		--notes "Release v$(VERSION) - see CHANGELOG.md for details" \
		--latest
	
	# Publish to npm locally
	npm publish
	
	@echo "Release v$(VERSION) completed!"

status: ## Show current status
	@echo "Current version: $(VERSION)"
	@echo "Git status:"
	@git status --porcelain
	@echo "Last 3 tags:"
	@git tag -l | tail -3

# Default target
.DEFAULT_GOAL := help