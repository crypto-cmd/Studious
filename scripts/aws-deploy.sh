#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────
# Studious — AWS EC2 Deployment Script
# Usage: ./scripts/aws-deploy.sh [-y]
#
# Reads secrets from .env and connection config from
# deploy-config.env. If all required values are present,
# deploys without prompting. Pass -y to skip confirmation.
# ─────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env"
CONFIG_FILE="deploy-config.env"
SKIP_CONFIRM=false

# ─── Colors ──────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERROR]${NC} $1"; }
step()  { echo -e "\n${BOLD}─── $1 ───${NC}"; }

prompt() {
    local var_name="$1"
    local label="$2"
    local default="${3:-}"
    local val

    if [ -n "$default" ]; then
        read -r -p "$label [$default]: " val
        val="${val:-$default}"
    else
        read -r -p "$label: " val
        while [ -z "$val" ]; do
            read -r -p "(required) $label: " val
        done
    fi
    eval "$var_name=\"$val\""
}

# ─── Load secrets from all .env files ───────────
load_env() {
    local merged
    merged=$(mktemp)

    # Start with backend secrets
    if [ -f backend/.env ]; then
        cat backend/.env >> "$merged"
        echo "" >> "$merged"
        info "Loaded backend/.env"
    else
        warn "backend/.env not found"
    fi

    # Add frontend secrets
    if [ -f frontend/.env ]; then
        cat frontend/.env >> "$merged"
        echo "" >> "$merged"
        info "Loaded frontend/.env"
    else
        warn "frontend/.env not found"
    fi

    # Add root .env (overrides any duplicates)
    if [ -f .env ]; then
        cat .env >> "$merged"
        echo "" >> "$merged"
        info "Loaded root .env"
    fi

    # Source the merged file
    set -a
    source "$merged"
    set +a
    rm "$merged"

    ok "All secrets loaded"
}

# ─── Load config, prompt only if missing ─────────
load_config() {
    local missing=false

    if [ -f "$CONFIG_FILE" ]; then
        set -a
        source "$CONFIG_FILE"
        set +a
        info "Loaded connection config from $CONFIG_FILE"
    fi

    # Set defaults
    SSH_USER="${SSH_USER:-ubuntu}"
    GIT_BRANCH="${GIT_BRANCH:-main}"

    # Check what's missing
    [ -z "${SSH_KEY_PATH:-}" ] && missing=true
    [ -z "${EC2_IP:-}" ] && missing=true
    [ -z "${GIT_REPO_URL:-}" ] && missing=true

    if [ "$missing" = true ]; then
        echo ""
        echo -e "${YELLOW}Some connection details are missing — prompting...${NC}"
        echo "  (Fill them in deploy-config.env next time to skip this)"

        echo ""
        echo -e "${BOLD}=== EC2 Connection${NC}"
        prompt SSH_USER "SSH user" "$SSH_USER"
        prompt SSH_KEY_PATH "SSH key path (.pem)" "${SSH_KEY_PATH:-}"
        prompt EC2_IP "EC2 public IP" "${EC2_IP:-}"

        echo ""
        echo -e "${BOLD}=== Git Repository${NC}"
        prompt GIT_REPO_URL "Git repo URL (SSH)" "${GIT_REPO_URL:-}"
        prompt GIT_BRANCH "Branch" "$GIT_BRANCH"

        # Save so next run has no prompts
        save_config
    fi

    # Auto-set domain from .env or nip.io
    DOMAIN="${DOMAIN:-$EC2_IP.nip.io}"
    APP_DOMAIN="${APP_DOMAIN:-app.$EC2_IP.nip.io}"
}

# ─── Save config for next time ─────────────────
save_config() {
    cat > "$CONFIG_FILE" << EOF
SSH_USER=$SSH_USER
SSH_KEY_PATH=$SSH_KEY_PATH
EC2_IP=$EC2_IP
GIT_REPO_URL=$GIT_REPO_URL
GIT_BRANCH=$GIT_BRANCH
EOF
    info "Connection config saved to $CONFIG_FILE"
}

# ─── SSH helper ──────────────────────────────────
remote() {
    ssh -i "$SSH_KEY_PATH" -A -o StrictHostKeyChecking=accept-new \
        "$SSH_USER@$EC2_IP" "$@"
}

# ─── Plan ────────────────────────────────────────
show_plan() {
    echo ""
    echo -e "${BOLD}─── Deployment Plan ───${NC}"
    echo "  EC2:       $SSH_USER@$EC2_IP"
    echo "  Key:       $SSH_KEY_PATH"
    echo "  Domain:    $DOMAIN → marketing"
    echo "  App:       $APP_DOMAIN → frontend + API"
    echo "  Repo:      $GIT_REPO_URL ($GIT_BRANCH)"
    echo ""
}

confirm() {
    if [ "$SKIP_CONFIRM" = true ]; then
        return
    fi
    read -r -p "Proceed with deployment? [y/N] " reply
    if [[ ! "$reply" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
}

# ─── 1. Install Docker ───────────────────────────
install_docker() {
    step "1/6 — Installing Docker on EC2"
    remote -- sudo apt-get update -qq
    remote -- sudo apt-get install -y -qq ca-certificates curl docker.io docker-compose-v2
    remote -- sudo usermod -aG docker "$SSH_USER"
    ok "Docker installed"
}

# ─── 2. Clone / Pull Repo ────────────────────────
clone_repo() {
    step "2/6 — Cloning repository"
    remote -- sudo apt-get install -y -qq git

    if remote -- "[ -d ~/Studious/.git ]" 2>/dev/null; then
        info "Repo exists — pulling latest"
        remote -- "cd ~/Studious && git fetch origin && git checkout $GIT_BRANCH && git pull origin $GIT_BRANCH"
    else
        remote -- "git clone --branch $GIT_BRANCH $GIT_REPO_URL ~/Studious"
    fi
    ok "Repository ready"
}

# ─── 3. Upload .env ─────────────────────────────
upload_env() {
    step "3/6 — Uploading merged .env to server"

    # Build a combined .env on the server from the sourced values
    remote -- "cat > ~/Studious/.env << 'EOFSEP'
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_KEY
GROQ_API_KEY=$GROQ_API_KEY
PINECONE_API_KEY=$PINECONE_API_KEY
PINECONE_INDEX_NAME=$PINECONE_INDEX_NAME
HF_TOKEN=$HF_TOKEN
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_BACKEND_URL=http://backend:7860
NEXT_PUBLIC_SITE_URL=http://$APP_DOMAIN
DOMAIN=$DOMAIN
APP_DOMAIN=$APP_DOMAIN
EOFSEP"

    ok ".env uploaded and merged"
}

# ─── 4. Build ────────────────────────────────────
build_services() {
    step "4/6 — Building Docker images"
    remote -- "cd ~/Studious && docker compose build"
    ok "Build complete"
}

# ─── 5. Start Services ───────────────────────────
start_services() {
    step "5/6 — Starting all services"
    remote -- "cd ~/Studious && docker compose up -d"
    sleep 3
    remote -- "cd ~/Studious && docker compose ps"
    ok "Services started"
}

# ─── 6. Health Check ────────────────────────────
health_check() {
    step "6/6 — Running health check"

    info "Checking backend health..."
    HEALTH=$(remote -- "curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health" 2>/dev/null || echo "failed")
    if [ "$HEALTH" = "200" ]; then
        ok "Backend /api/health → 200"
    else
        warn "Backend health check returned: $HEALTH"
    fi

    info "Checking frontend..."
    FRONTEND=$(remote -- "curl -s -o /dev/null -w '%{http_code}' http://localhost/" -H "Host: $APP_DOMAIN" 2>/dev/null || echo "failed")
    if [ "$FRONTEND" = "200" ]; then
        ok "Frontend ($APP_DOMAIN) → 200"
    else
        warn "Frontend check returned: $FRONTEND"
    fi

    info "Checking marketing..."
    MARKETING=$(remote -- "curl -s -o /dev/null -w '%{http_code}' http://localhost/" -H "Host: $DOMAIN" 2>/dev/null || echo "failed")
    if [ "$MARKETING" = "200" ]; then
        ok "Marketing ($DOMAIN) → 200"
    else
        warn "Marketing check returned: $MARKETING"
    fi

    echo ""
    ok "Deployment complete!"
    echo ""
    echo "  Add to your local /etc/hosts:"
    echo "    $EC2_IP  $DOMAIN $APP_DOMAIN"
    echo ""
    echo "  Then visit:"
    echo "    http://$APP_DOMAIN  (app)"
    echo "    http://$DOMAIN      (marketing)"
}

# ─── Main ─────────────────────────────────────────
main() {
    # Parse flags
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -y|--yes) SKIP_CONFIRM=true; shift ;;
            *) shift ;;
        esac
    done

    load_env
    load_config
    show_plan
    confirm

    info "Testing SSH connection..."
    remote -- "echo 'Connected to \$(hostname)'" || {
        err "Cannot connect to $SSH_USER@$EC2_IP"
        info "Check that:"
        echo "  - The instance is running"
        echo "  - Security group allows SSH (port 22)"
        echo "  - The key path is correct: $SSH_KEY_PATH"
        exit 1
    }

    install_docker
    clone_repo
    upload_env
    build_services
    start_services
    health_check
}

main "$@"
