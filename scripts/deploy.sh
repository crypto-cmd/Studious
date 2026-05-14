#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Studious — Docker Compose Deploy Script
# Usage: ./scripts/deploy.sh [up|down|build|logs|restart]
# ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        err ".env file not found!"
        info "Copy .env.example to .env and fill in your values:"
        echo "  cp .env.example .env"
        exit 1
    fi
    info "Environment file found at $ENV_FILE"
}

cmd_up() {
    check_env
    info "Building and starting all services..."
    docker compose -f "$COMPOSE_FILE" up --build -d
    info "Waiting for services to be healthy..."
    sleep 5
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    ok "Studious is running!"
    echo ""
    echo "  Marketing site:  http://${DOMAIN:-studious.local}"
    echo "  App:             http://${APP_DOMAIN:-app.studious.local}"
    echo ""
    info "Add these to your /etc/hosts for local access:"
    echo "  127.0.0.1  ${DOMAIN:-studious.local} ${APP_DOMAIN:-app.studious.local}"
}

cmd_down() {
    info "Stopping all services..."
    docker compose -f "$COMPOSE_FILE" down
    ok "All services stopped."
}

cmd_build() {
    check_env
    info "Building all images (no cache)..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
    ok "Build complete."
}

cmd_logs() {
    docker compose -f "$COMPOSE_FILE" logs -f "$@"
}

cmd_restart() {
    info "Restarting all services..."
    docker compose -f "$COMPOSE_FILE" restart
    ok "Services restarted."
}

cmd_status() {
    docker compose -f "$COMPOSE_FILE" ps
}

case "${1:-up}" in
    up)
        cmd_up
        ;;
    down)
        cmd_down
        ;;
    build)
        cmd_build
        ;;
    logs)
        shift
        cmd_logs "$@"
        ;;
    restart)
        cmd_restart
        ;;
    status)
        cmd_status
        ;;
    *)
        echo "Usage: $0 [up|down|build|logs|restart|status]"
        echo ""
        echo "Commands:"
        echo "  up       Build and start all services (default)"
        echo "  down     Stop all services"
        echo "  build    Rebuild all images from scratch"
        echo "  logs     Tail logs (optional: <service_name>)"
        echo "  restart  Restart all services"
        echo "  status   Show service status"
        exit 1
        ;;
esac
