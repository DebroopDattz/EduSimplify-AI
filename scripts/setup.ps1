#Requires -Version 5.1
<#
.SYNOPSIS
    EduSimplify AI – Project Setup Script (PowerShell)
.DESCRIPTION
    Installs all frontend and backend dependencies, creates .env files from
    examples, and initialises the ChromaDB vector store.
.EXAMPLE
    .\scripts\setup.ps1
.EXAMPLE
    .\scripts\setup.ps1 -SkipChroma
#>

[CmdletBinding()]
param(
    [switch]$SkipChroma,
    [switch]$SkipFrontend,
    [switch]$SkipBackend
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Colour helpers ─────────────────────────────────────────────────────────────
function Write-Info    { param($m) Write-Host "[INFO]  $m"  -ForegroundColor Cyan }
function Write-Ok      { param($m) Write-Host "[OK]    $m"  -ForegroundColor Green }
function Write-Warn    { param($m) Write-Host "[WARN]  $m"  -ForegroundColor Yellow }
function Write-Err     { param($m) Write-Host "[ERROR] $m"  -ForegroundColor Red }

# ── Banner ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "   EduSimplify AI  —  Project Setup (PowerShell)"              -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""

# ── Resolve root directory ─────────────────────────────────────────────────────
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir   = Split-Path -Parent $ScriptDir
Set-Location $RootDir
Write-Info "Working directory: $RootDir"
Write-Host ""

# ── Helper: assert a command exists ───────────────────────────────────────────
function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Err "'$Name' is not installed or not in PATH. Please install it and re-run."
        exit 1
    }
    Write-Ok "$Name found: $((Get-Command $Name).Source)"
}

# ── Prerequisite checks ────────────────────────────────────────────────────────
Write-Info "Checking prerequisites..."

Assert-Command "node"
Assert-Command "npm"
Assert-Command "python"

# Python version check (>= 3.11)
$PythonVerStr = python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>&1
$Parts = $PythonVerStr -split "\."
$PyMajor = [int]$Parts[0]
$PyMinor = [int]$Parts[1]
if ($PyMajor -lt 3 -or ($PyMajor -eq 3 -and $PyMinor -lt 11)) {
    Write-Err "Python 3.11+ required. Found: $PythonVerStr"
    exit 1
}
Write-Ok "Python $PythonVerStr ✓"

# Node.js version check (>= 18)
$NodeVerStr = node -e "process.stdout.write(process.version.replace('v',''))" 2>&1
$NodeMajor  = [int]($NodeVerStr -split "\.")[0]
if ($NodeMajor -lt 18) {
    Write-Err "Node.js 18+ required. Found: $NodeVerStr"
    exit 1
}
Write-Ok "Node.js $NodeVerStr ✓"
Write-Host ""

# ── Frontend dependencies ──────────────────────────────────────────────────────
if (-not $SkipFrontend) {
    Write-Info "Installing frontend dependencies..."
    $FrontendDir = Join-Path $RootDir "frontend"
    if (Test-Path $FrontendDir) {
        Push-Location $FrontendDir
        try {
            npm install
            if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
            Write-Ok "Frontend npm packages installed."
        } finally {
            Pop-Location
        }
    } else {
        Write-Warn "frontend/ directory not found – skipping."
    }
    Write-Host ""
}

# ── Backend virtual environment & dependencies ─────────────────────────────────
if (-not $SkipBackend) {
    Write-Info "Setting up Python virtual environment for backend..."
    $BackendDir = Join-Path $RootDir "backend"
    if (Test-Path $BackendDir) {
        Push-Location $BackendDir
        try {
            $VenvDir = Join-Path $BackendDir ".venv"
            if (-not (Test-Path $VenvDir)) {
                python -m venv .venv
                Write-Ok "Virtual environment created at backend\.venv"
            } else {
                Write-Info "Virtual environment already exists."
            }

            # Activate the venv
            $ActivateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
            if (Test-Path $ActivateScript) {
                & $ActivateScript
            } else {
                Write-Warn "Activate.ps1 not found; attempting to use system Python."
            }

            python -m pip install --upgrade pip --quiet
            pip install -r requirements.txt --quiet
            if ($LASTEXITCODE -ne 0) { throw "pip install failed" }
            Write-Ok "Backend Python packages installed."

            # Deactivate by restoring PATH (PowerShell venv activation modifies $env:PATH)
            if (Test-Path Function:\deactivate) { deactivate }
        } finally {
            Pop-Location
        }
    } else {
        Write-Warn "backend/ directory not found – skipping."
    }
    Write-Host ""
}

# ── Environment files ──────────────────────────────────────────────────────────
Write-Info "Creating .env files from examples..."

function New-EnvFile {
    param(
        [string]$Source,
        [string]$Destination
    )
    if ((Test-Path $Source) -and (-not (Test-Path $Destination))) {
        Copy-Item $Source $Destination
        Write-Ok "Created $Destination from $Source"
    } elseif (Test-Path $Destination) {
        Write-Info "$Destination already exists – skipping."
    } else {
        Write-Warn "Example file $Source not found – skipping."
    }
}

New-EnvFile (Join-Path $RootDir "frontend\.env.example") (Join-Path $RootDir "frontend\.env.local")
New-EnvFile (Join-Path $RootDir "backend\.env.example")  (Join-Path $RootDir "backend\.env")
Write-Host ""

# ── ChromaDB initialisation ────────────────────────────────────────────────────
if (-not $SkipChroma) {
    Write-Info "Initialising ChromaDB persistent store..."
    $BackendDir = Join-Path $RootDir "backend"
    if (Test-Path $BackendDir) {
        Push-Location $BackendDir
        try {
            $ChromaDir = if ($env:CHROMA_PERSIST_DIRECTORY) {
                            $env:CHROMA_PERSIST_DIRECTORY
                         } else {
                            Join-Path $BackendDir "chroma_db"
                         }

            if (-not (Test-Path $ChromaDir)) {
                New-Item -ItemType Directory -Path $ChromaDir | Out-Null
                Write-Ok "Created ChromaDB directory at: $ChromaDir"
            } else {
                Write-Info "ChromaDB directory already exists at: $ChromaDir"
            }

            # Activate venv for the smoke test
            $ActivateScript = Join-Path $BackendDir ".venv\Scripts\Activate.ps1"
            if (Test-Path $ActivateScript) {
                & $ActivateScript

                $PyScript = @"
import chromadb, os
chroma_dir = os.getenv('CHROMA_PERSIST_DIRECTORY', r'$ChromaDir')
client = chromadb.PersistentClient(path=chroma_dir)
col_name = os.getenv('CHROMA_COLLECTION_NAME', 'edusimplify_docs')
collection = client.get_or_create_collection(col_name)
print(f"  ChromaDB collection '{col_name}' ready (items: {collection.count()})")
"@
                $PyScript | python
                if ($LASTEXITCODE -ne 0) { throw "ChromaDB init script failed" }
                Write-Ok "ChromaDB initialised successfully."

                if (Test-Path Function:\deactivate) { deactivate }
            } else {
                Write-Warn "Virtual environment not found – run backend setup first."
            }
        } catch {
            Write-Warn "ChromaDB initialisation failed: $_"
        } finally {
            Pop-Location
        }
    } else {
        Write-Warn "backend/ not found – skipping ChromaDB setup."
    }
    Write-Host ""
}

# ── Summary ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ✅  Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor White
Write-Host "  1. Edit " -NoNewline; Write-Host "frontend\.env.local" -ForegroundColor Yellow -NoNewline; Write-Host "  and fill in your IBM / Vercel credentials."
Write-Host "  2. Edit " -NoNewline; Write-Host "backend\.env" -ForegroundColor Yellow -NoNewline; Write-Host "          and fill in your IBM Cloud credentials."
Write-Host ""
Write-Host "  Start the backend:" -ForegroundColor White
Write-Host "    cd backend; .\.venv\Scripts\Activate.ps1; uvicorn main:app --reload" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Start the frontend:" -ForegroundColor White
Write-Host "    cd frontend; npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Or start everything with Docker Compose:" -ForegroundColor White
Write-Host "    docker compose up --build" -ForegroundColor Cyan
Write-Host ""
