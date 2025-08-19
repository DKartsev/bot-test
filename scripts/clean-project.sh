#!/bin/bash

# Скрипт очистки проекта от временных и ненужных файлов
# Использование: ./scripts/clean-project.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧹 Начинаем очистку проекта...${NC}"

# Удаление временных файлов и директорий
echo -e "${YELLOW}Удаляем временные файлы...${NC}"

# Node.js
rm -rf node_modules/
rm -rf packages/*/node_modules/
rm -f package-lock.json
rm -f packages/*/package-lock.json

# Build outputs
rm -rf dist/
rm -rf build/
rm -rf packages/operator-admin/.next/
rm -rf packages/operator-admin/out/
rm -rf packages/operator-admin/admin-out/

# Logs
rm -rf logs/
rm -f *.log
rm -f packages/*/*.log

# Coverage
rm -rf coverage/
rm -rf packages/*/coverage/
rm -f *.lcov
rm -f packages/*/*.lcov

# Cache
rm -rf .npm/
rm -rf .eslintcache
rm -rf .cache/
rm -rf .parcel-cache/
rm -rf .turbo/

# IDE
rm -rf .vscode/
rm -rf .idea/
rm -f *.swp
rm -f *.swo
rm -f *~

# OS
rm -f .DS_Store
rm -f Thumbs.db

# PM2
rm -rf .pm2/

# Test results
rm -rf test-results/
rm -rf packages/*/test-results/
rm -f test-results.xml

# Backup directories
rm -rf backup-*/
rm -rf packages/*/backup-*/

# Python cache
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true

# Temporary files
rm -rf tmp/
rm -rf temp/
rm -f *.tmp
rm -f *.backup
rm -f *.bak

# Render specific files
rm -f render.yaml
rm -f render-*.yaml

# Auto-generated documentation
rm -f AUTO_COMMIT_README.md
rm -f DEPLOYMENT*.md
rm -f QUICK_*.md
rm -f DEBUGGING_*.md
rm -f MIGRATION_*.md
rm -f GEMINI.md
rm -f AGENTS.md

# Docker
rm -f .dockerignore

# Git (оставляем только .gitignore)
# rm -rf .git/

echo -e "${GREEN}✅ Очистка завершена!${NC}"

# Создание чистого .gitignore
echo -e "${YELLOW}Создаем чистый .gitignore...${NC}"

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.next/
out/
admin-out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next
out

# Nuxt.js build / generate output
.nuxt
dist

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# PM2
.pm2/

# Docker
.dockerignore

# Backup files
*.backup
*.bak
*.tmp

# Test files
test-results/
playwright-report/
test-results.xml

# Local development
.local/
local/

# Python cache
__pycache__/
*.py[cod]
*$py.class

# Backup directories
backup-*/
EOF

echo -e "${GREEN}✅ .gitignore обновлен${NC}"

# Создание .dockerignore
echo -e "${YELLOW}Создаем .dockerignore...${NC}"

cat > .dockerignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.next/
out/
admin-out/

# Environment files
.env*
!.env.example

# Logs
logs/
*.log

# Test files
coverage/
test-results/
*.test.ts
*.spec.ts

# Development files
.vscode/
.idea/
*.swp
*.swo

# Git
.git/
.gitignore

# Documentation
README.md
*.md
docs/

# Scripts
scripts/
.github/

# Temporary files
tmp/
temp/
*.tmp
*.backup

# OS files
.DS_Store
Thumbs.db

# Python files
*.py
__pycache__/

# Backup directories
backup-*/
EOF

echo -e "${GREEN}✅ .dockerignore создан${NC}"

echo -e "${GREEN}🎉 Проект очищен и готов к деплою на VM!${NC}"
echo ""
echo -e "${YELLOW}Следующие шаги:${NC}"
echo "1. Настройте переменные окружения: cp env-template.txt .env"
echo "2. Установите зависимости: npm install"
echo "3. Соберите проект: npm run build"
echo "4. Запустите деплой: ./scripts/deploy-vm.sh <VM_IP> <SSH_KEY_PATH>"
