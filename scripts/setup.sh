#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# EduSimplify AI – Project Setup Script (Bash / macOS / Linux / WSL)
# ──────────────────────────────────────────────────────────────────────────────
# Usage:
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# ── Banner ─────────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "  ███████╗██████╗ ██╗   ██╗███████╗██╗███╗   ███╗██████╗ ██╗     ██╗███████╗██╗   ██╗"
echo "  ██╔════╝██╔══██╗██║   ██║██╔════╝██║████╗ ████║██╔══██╗██║     ██║██╔════╝╚██╗ ██╔╝"
echo "  █████╗  ██║  ██║██║   ██║███████╗██║██╔████╔██║██████╔╝██║     ██║█████╗   ╚████╔╝ "
echo "  ██╔══╝  ██║  ██║██║   ██║╚════██║██║██║╚██╔╝██║██╔═══╝ ██║     ██║██╔══╝    ╚██╔╝  "
echo "  ███████╗██████╔╝╚██████╔╝███████║██║██║ ╚═╝ ██║██║     ███████╗██║██║        ██║   "
echo "  ╚══════╝╚═════╝  ╚═════╝ ╚══════╝╚═╝╚═╝     ╚═╝╚═╝     ╚══════╝╚═╝╚═╝        ╚═╝   "
echo -e "${RESET}"
echo -e "  ${CYAN}EduSimplify AI – Project Setup${RESET}"
echo "  ─────────────────────────────────────────────────────────"
echo ""

# ── Script directory (repo root is one level up) ───────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"
info "Working directory: $ROOT_DIR"
echo ""

# ── Prerequisite checks ────────────────────────────────────────────────────────
info "Checking prerequisites..."

check_command() {
  if ! command -v "$1" &>/dev/null; then
    error "'$1' is not installed or not in PATH. Please install it and re-run."
    exit 1
  fi
  success "$1 found: $(command -v "$1")"
}

check_command node
check_command npm
check_command python3
check_command pip3

# Python version check (≥ 3.11)
PYTHON_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
REQUIRED_MAJOR=3
REQUIRED_MINOR=11
ACTUAL_MAJOR=$(echo "$PYTHON_VER" | cut -d. -f1)
ACTUAL_MINOR=$(echo "$PYTHON_VER" | cut -d. -f2)

if [ "$ACTUAL_MAJOR" -lt "$REQUIRED_MAJOR" ] || \
   ([ "$ACTUAL_MAJOR" -eq "$REQUIRED_MAJOR" ] && [ "$ACTUAL_MINOR" -lt "$REQUIRED_MINOR" ]); then
  error "Python $REQUIRED_MAJOR.$REQUIRED_MINOR+ required. Found: $PYTHON_VER"
  exit 1
fi
success "Python $PYTHON_VER ✓"

# Node version check (≥ 18)
NODE_VER=$(node -e "process.stdout.write(process.version.replace('v',''))")
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  error "Node.js 18+ required. Found: $NODE_VER"
  exit 1
fi
success "Node.js $NODE_VER ✓"
echo ""

# ── Frontend dependencies ──────────────────────────────────────────────────────
info "Installing frontend dependencies..."
if [ -d "frontend" ]; then
  cd "$ROOT_DIR/frontend"
  npm install
  success "Frontend npm packages installed."
else
  warn "frontend/ directory not found – skipping."
fi
echo ""
cd "$ROOT_DIR"

# ── Backend virtual environment & dependencies ─────────────────────────────────
info "Setting up Python virtual environment for backend..."
if [ -d "backend" ]; then
  cd "$ROOT_DIR/backend"

  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    success "Virtual environment created at backend/.venv"
  else
    info "Virtual environment already exists."
  fi

  # Activate venv
  # shellcheck disable=SC1091
  source .venv/bin/activate

  pip install --upgrade pip --quiet
  pip install -r requirements.txt --quiet
  success "Backend Python packages installed."

  deactivate
else
  warn "backend/ directory not found – skipping."
fi
echo ""
cd "$ROOT_DIR"

# ── Environment files ──────────────────────────────────────────────────────────
info "Creating .env files from examples..."

create_env() {
  local src="$1"
  local dest="$2"
  if [ -f "$src" ] && [ ! -f "$dest" ]; then
    cp "$src" "$dest"
    success "Created $dest from $src"
  elif [ -f "$dest" ]; then
    info "$dest already exists – skipping."
  else
    warn "Example file $src not found – skipping."
  fi
}

create_env "frontend/.env.example"  "frontend/.env.local"
create_env "backend/.env.example"   "backend/.env"
echo ""

# ── ChromaDB initialisation ────────────────────────────────────────────────────
info "Initialising ChromaDB persistent store..."
if [ -d "backend" ]; then
  cd "$ROOT_DIR/backend"

  CHROMA_DIR="${CHROMA_PERSIST_DIRECTORY:-./chroma_db}"
  if [ ! -d "$CHROMA_DIR" ]; then
    mkdir -p "$CHROMA_DIR"
    success "Created ChromaDB directory at: $CHROMA_DIR"
  else
    info "ChromaDB directory already exists at: $CHROMA_DIR"
  fi

  # Run a quick Python smoke-test to confirm chromadb is importable
  if source .venv/bin/activate 2>/dev/null; then
    python3 - <<'PYEOF'
import chromadb, os
chroma_dir = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")
client = chromadb.PersistentClient(path=chroma_dir)
col_name = os.getenv("CHROMA_COLLECTION_NAME", "edusimplify_docs")
collection = client.get_or_create_collection(col_name)
print(f"  ChromaDB collection '{col_name}' ready (items: {collection.count()})")
PYEOF
    deactivate
    success "ChromaDB initialised successfully."
  else
    warn "Could not activate venv – skipping ChromaDB smoke test."
  fi
else
  warn "backend/ not found – skipping ChromaDB setup."
fi
echo ""
cd "$ROOT_DIR"

# ── Summary ────────────────────────────────────────────────────────────────────
echo -e "${BOLD}${GREEN}"
echo "  ✅  Setup complete!"
echo -e "${RESET}"
echo "  Next steps:"
echo "  1. Edit ${YELLOW}frontend/.env.local${RESET}  and fill in your IBM / Vercel credentials."
echo "  2. Edit ${YELLOW}backend/.env${RESET}          and fill in your IBM Cloud credentials."
echo ""
echo "  Start the backend:"
echo "    ${CYAN}cd backend && source .venv/bin/activate && uvicorn main:app --reload${RESET}"
echo ""
echo "  Start the frontend:"
echo "    ${CYAN}cd frontend && npm run dev${RESET}"
echo ""
echo "  Or start everything with Docker Compose:"
echo "    ${CYAN}docker compose up --build${RESET}"
echo ""
