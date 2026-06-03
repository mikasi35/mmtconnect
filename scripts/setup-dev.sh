#!/usr/bin/env bash
# ============================================================
#  MMT Care Connect — Local Dev Setup
#  Usage: ./scripts/setup-dev.sh
# ============================================================
set -e

BOLD='\033[1m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "\n${BOLD}${BLUE}MMT Care Connect — Dev Setup${NC}\n"

# 1. Check prerequisites
echo -e "${BOLD}Checking prerequisites…${NC}"
for cmd in node npm psql; do
  if ! command -v $cmd &>/dev/null; then
    echo -e "${RED}✗ $cmd not found. Please install it first.${NC}"; exit 1
  fi
done
echo -e "${GREEN}✓ node $(node -v)  npm $(npm -v)${NC}"

# 2. Install dependencies
echo -e "\n${BOLD}Installing dependencies…${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 3. Setup .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ .env created from .env.example${NC}"
else
  echo -e "${YELLOW}⚠ .env already exists — skipping${NC}"
fi

# 4. Create postgres DB
echo -e "\n${BOLD}Setting up database…${NC}"
export PGPASSWORD=${DB_PASS:-postgres}
PGUSER=${DB_USER:-postgres}
PGHOST=${DB_HOST:-localhost}
PGPORT=${DB_PORT:-5432}
DBNAME=${DB_NAME:-mmt_care_connect}

# Create DB if not exists
psql -h $PGHOST -p $PGPORT -U $PGUSER -tc "SELECT 1 FROM pg_database WHERE datname='$DBNAME'" | grep -q 1 || \
  psql -h $PGHOST -p $PGPORT -U $PGUSER -c "CREATE DATABASE $DBNAME"
echo -e "${GREEN}✓ Database '$DBNAME' ready${NC}"

# Run migrations
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $DBNAME -f scripts/migrate.sql -q
echo -e "${GREEN}✓ Schema migrated${NC}"

# Seed data
psql -h $PGHOST -p $PGPORT -U $PGUSER -d $DBNAME -f scripts/seed.sql -q
echo -e "${GREEN}✓ Seed data loaded${NC}"

# 5. Done
echo -e "\n${BOLD}${GREEN}Setup complete!${NC}\n"
echo -e "Start the backend:   ${BOLD}npm run dev:backend${NC}"
echo -e "Start the web app:   ${BOLD}cd web && npm run dev${NC}  (requires web/node_modules)"
echo -e "Start mobile app:    ${BOLD}cd mobile && npx expo start${NC}  (requires mobile/node_modules)"
echo -e "\nTest credentials:"
echo -e "  Admin:       admin@mmtcare.com.au / Admin@2026!"
echo -e "  Coordinator: sarah@mmtcare.com.au / Admin@2026!\n"
