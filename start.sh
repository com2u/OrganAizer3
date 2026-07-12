#!/bin/bash
set -e

echo "=== Terminlandschaft Startup ==="

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: node not found"
    exit 1
fi

# Kill any existing server processes
echo "Stopping existing services..."
pkill -f "python.*server" 2>/dev/null || true
sleep 1

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --silent
fi

# Build frontend
echo "Building frontend..."
npm run build --silent
cd ..

# Import data if database doesn't exist
if [ ! -f "data/terminlandschaft.db" ]; then
    echo "Importing schedule data..."
    python3 -m backend.main import schedule.xlsx
fi

# Load config from .env (ignoring comments and blank lines)
if [ -f ".env" ]; then
    export $(grep -v '^\s*#' .env | grep -v '^\s*$' | xargs)
fi

PORT=${WEB_PORT:-4815}

# Get LAN IP
LAN_IP=$(hostname -I | awk '{print $1}')

# Start Flask server
echo "Starting Terminlandschaft on http://localhost:${PORT}"
echo "LAN access: http://${LAN_IP}:${PORT}"
echo "Debug logs are being written to log.txt"
echo "Press Ctrl+C to stop"
python3 -m backend.server
