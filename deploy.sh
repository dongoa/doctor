#!/bin/bash
# 部署前请确认：云服务器安全组已放行 80 端口（入站），否则外网无法访问。
set -e

SERVER="root@42.193.200.169"
PASSWORD="bde987524A6406d4"
REMOTE_DIR="/var/www/suture-ai"

# 检查本地依赖
if ! command -v sshpass &>/dev/null; then
    echo "❌ 未找到 sshpass，无法自动输入 SSH 密码。"
    echo "   安装方法: brew install sshpass  或  brew install hudochenkov/sshpass/sshpass"
    exit 1
fi

# Helper function to run SSH commands with password（失败时退出）
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
run_ssh "apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv python3-pip nodejs npm nginx"

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
    ./venv/bin/pip install --default-timeout=120 -r requirements.txt
    
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
    sleep 2
    systemctl is-active suture-backend || { echo "ERROR: suture-backend 未成功启动"; exit 1; }
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
    
    echo "Setting npm registry..."
    npm config set registry https://registry.npmjs.org/
    npm config set fetch-timeout 120000
    npm config set fetch-retries 3
    
    echo "Installing Node.js dependencies..."
    npm install
    
    echo "Configuring API URL for production..."
    if [ -f services/geminiService.ts ]; then
        sed -i 's|http://localhost:8000/api/evaluate|/api/evaluate|g' services/geminiService.ts
    fi

    echo "Building frontend..."
    npm run build
    
    if [ ! -f dist/index.html ]; then
        echo "ERROR: dist/index.html 未生成，前端构建失败。"
        exit 1
    fi
    echo "Frontend build complete (dist 已生成)."
EOF

echo "--------------------------------------------------"
echo "🌐 5. Configuring Nginx..."
echo "--------------------------------------------------"
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "bash -s" << 'EOF'
    set -e
    
    echo "Configuring Nginx..."
    cat > /etc/nginx/sites-available/suture-ai <<EOL
server {
    listen 80;
    server_name 42.193.200.169;

    # Frontend
    location / {
        root /var/www/suture-ai/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
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
    
    # Enable Site
    ln -sf /etc/nginx/sites-available/suture-ai /etc/nginx/sites-enabled/
    
    # Remove default site to allow IP access to our app
    rm -f /etc/nginx/sites-enabled/default
    
    # Test config and ensure Nginx is running
    nginx -t
    systemctl enable nginx 2>/dev/null || true
    systemctl start nginx 2>/dev/null || true
    systemctl restart nginx
    
    echo "Nginx configured."
EOF

echo "--------------------------------------------------"
echo "🔍 6. Verifying deployment..."
echo "--------------------------------------------------"
run_ssh "set -e
  echo '--- Nginx ---' && systemctl is-active nginx
  echo '--- Backend ---' && systemctl is-active suture-backend
  echo '--- Frontend dist ---'
  test -f /var/www/suture-ai/frontend/dist/index.html || { echo 'ERROR: dist/index.html 不存在'; exit 1; }
  ls -la /var/www/suture-ai/frontend/dist/ | head -5
  echo -n '--- HTTP 80 --- ' && curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:80
  echo -n '--- Backend 8000 --- ' && curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/docs
  echo 'Verification OK.'"

echo "--------------------------------------------------"
echo "✅ Deployment Complete!"
echo "👉 Visit http://42.193.200.169"
echo ""
echo "若无法访问，请依次检查："
echo "  1. 云服务器安全组/防火墙是否放行 80 端口"
echo "  2. 在本机执行: ./diagnose.sh 查看详细状态"
echo "--------------------------------------------------"