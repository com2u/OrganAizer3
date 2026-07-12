#!/bin/bash

cd frontend
npm install
npm run build
cd ..

# Configuration
HOST="home13489554.1and1-data.host"
USER="p424599"
PASS="PPH21u1u."
LOCAL_DIR="frontend/dist"
REMOTE_DIR="./OrganAIzer" # Change this if you need to upload to a specific subdirectory

# Check if frontend/dist exists
if [ ! -d "$LOCAL_DIR" ]; then
    echo "Directory $LOCAL_DIR does not exist. Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..

    # Check again
    if [ ! -d "$LOCAL_DIR" ]; then
        echo "Error: Build failed. $LOCAL_DIR still does not exist."
        exit 1
    fi
fi

# Check for sshpass
if ! command -v sshpass &> /dev/null; then
    echo "Error: sshpass is not installed."
    echo "Please install it using your package manager (e.g., sudo apt-get install sshpass)"
    exit 1
fi

echo "Uploading $LOCAL_DIR to $USER@$HOST:$REMOTE_DIR ..."

# Include dotfiles (e.g. .htaccess) in the glob expansion below
shopt -s dotglob

# Use sshpass with scp for recursive upload
# -o StrictHostKeyChecking=no avoids the prompt for new hosts (use with caution)
sshpass -p "$PASS" scp -r -o StrictHostKeyChecking=no "$LOCAL_DIR"/* "$USER@$HOST:$REMOTE_DIR"

if [ $? -eq 0 ]; then
    echo "Upload successful!"
else
    echo "Upload failed."
    exit 1
fi
