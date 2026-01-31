#!/bin/bash

SERVER="root@42.193.200.169"
PASSWORD="bde987524A6406d4"
REMOTE_DIR="/var/www/suture-ai"

# Helper function to run SSH commands with password
run_ssh() {
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "$1"
}

# Helper function to run SCP/Rsync with password
run_rsync() {
    # Sync Backend
    echo "Syncing Backend..."
    sshpass -p "$PASSWORD" rsync -avz --progress -e "ssh -o StrictHostKeyChecking=no" \
        --exclude 'venv' \
        --exclude '__pycache__' \
        --exclude '.git' \
        --exclude '.DS_Store' \
        backend/ \
        $SERVER:$REMOTE_DIR/backend/

    # Sync Frontend
    echo "Syncing Frontend..."
    sshpass -p "$PASSWORD" rsync -avz --progress -e "ssh -o StrictHostKeyChecking=no" \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude '.git' \
        --exclude '.DS_Store' \
        frontend/ \
        $SERVER:$REMOTE_DIR/frontend/
}

echo "🚀 Starting Deployment to $SERVER..."

echo "--------------------------------------------------"
echo "📦 1. Installing System Dependencies on Server..."
echo "--------------------------------------------------"
run_ssh "echo 'Checking OS...' && (if [ -f /etc/os-release ]; then . /etc/os-release; echo \"Detected ID=\$ID\"; if [[ \"\$ID\" =~ (centos|rhel|fedora|rocky|almalinux|opencloudos) ]]; then echo 'Detected RHEL-like OS'; dnf install -y python3-pip nodejs npm; dnf install -y nginx || dnf --disableexcludes=all install -y nginx; else apt update && apt install -y python3-venv python3-pip nodejs npm nginx; fi; else apt update && apt install -y python3-venv python3-pip nodejs npm nginx; fi)"

echo "--------------------------------------------------"
echo "📂 2. Uploading Code..."
echo "--------------------------------------------------"
# Create directory
run_ssh "mkdir -p $REMOTE_DIR/backend $REMOTE_DIR/frontend"

# Sync files
run_rsync

echo "--------------------------------------------------"
echo "🐍 3. Setting up Backend..."
echo "--------------------------------------------------"
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "bash -s" << 'EOF'
    set -e # Exit on error
    cd /var/www/suture-ai/backend
    
    echo "Creating virtual environment..."
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    echo "Installing Python dependencies..."
    ./venv/bin/pip install -r requirements.txt
    
    echo "Creating Systemd service..."
    cat > /etc/systemd/system/suture-backend.service <<EOL
[Unit]
Description=Suture AI Backend
After=network.target

[Service]
User=root
WorkingDirectory=/var/www/suture-ai/backend
ExecStart=/var/www/suture-ai/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOL

    echo "Configuring Systemd service..."
    systemctl daemon-reload
    systemctl enable suture-backend
    systemctl restart suture-backend
    
    echo "Backend setup complete."
EOF

echo "--------------------------------------------------"
echo "⚛️ 4. Setting up Frontend..."
echo "--------------------------------------------------"
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "bash -s" << 'EOF'
    set -e
    cd /var/www/suture-ai/frontend
    
    echo "Cleaning up old lock file..."
    rm -f package-lock.json
    
    echo "Setting npm registry to public..."
    npm config set registry https://registry.npmjs.org/ 
    
    echo "Installing Node.js dependencies..."
    npm install --include=optional
    
    echo "Configuring API URL for production..."
    sed -i 's|http://localhost:8000/api/evaluate|/api/evaluate|g' services/evaluationService.ts

    echo "Building frontend..."
    npm run build
    
    echo "Frontend build complete."
EOF

echo "--------------------------------------------------"
echo "🌐 5. Configuring Nginx..."
echo "--------------------------------------------------"
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "bash -s" << 'EOF'
    set -e
    
    echo "Configuring Nginx..."
    
    # Disable SELinux temporarily to avoid permission issues
    if command -v setenforce &> /dev/null; then
        setenforce 0 || true
        echo "SELinux set to permissive mode."
    fi

    # Ensure Nginx can read the files
    chmod -R 755 /var/www/suture-ai
    echo "Permissions set for /var/www/suture-ai"

    # Detect OS again for Nginx config path
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" =~ (centos|rhel|fedora|rocky|almalinux|opencloudos) ]]; then
            NGINX_CONF="/etc/nginx/conf.d/suture-ai.conf"
            # Ensure sites-enabled/available is not used or cleanup if needed
            mkdir -p /etc/nginx/conf.d
            # Remove default config if it exists to prevent conflict
            rm -f /etc/nginx/conf.d/default.conf
        else
            NGINX_CONF="/etc/nginx/sites-available/suture-ai"
            mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
        fi
    else
        NGINX_CONF="/etc/nginx/sites-available/suture-ai"
        mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    fi
    
    echo "Writing config to $NGINX_CONF"
    
    cat > "$NGINX_CONF" <<EOL
server {
    listen 80 default_server;
    server_name 42.193.200.169 _;

    # Frontend
    location / {
        root /var/www/suture-ai/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000 ;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        
        # Increase timeout for AI processing
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        
        # Allow large file uploads
        client_max_body_size 50M;
    }
}
EOL
    
    # Enable Site for Debian/Ubuntu only (symlink)
    if [[ "$NGINX_CONF" == *"/sites-available/"* ]]; then
        ln -sf /etc/nginx/sites-available/suture-ai /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
    fi
    
    # Test and Restart
    nginx -t
    
    # Check if nginx is already running to decide reload or start
    if systemctl is-active --quiet nginx; then
        echo "Nginx is running, reloading..."
        systemctl reload nginx
    else
        echo "Nginx is stopped, starting..."
        # Try to free port 80 if occupied
        fuser -k 80/tcp || true
        systemctl start nginx || (echo "Nginx failed to start. Logs:" && journalctl -xeu nginx.service --no-pager | tail -n 50)
    fi
    
    # Ensure enabled on boot
    systemctl enable nginx
    
    echo "Nginx configured."
EOF

echo "--------------------------------------------------"
echo "✅ Deployment Complete!"
echo "👉 Visit http://42.193.200.169 "
echo "--------------------------------------------------"