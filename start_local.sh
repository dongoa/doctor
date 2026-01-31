#!/bin/bash

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Local Development Environment...${NC}"

# Function to kill background processes on exit
cleanup() {
    echo -e "\n${BLUE}🛑 Stopping services...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit
}

trap cleanup SIGINT

# Get the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"

# --- Backend Setup ---
echo -e "${GREEN}🐍 Setting up Backend...${NC}"
BACKEND_DIR="$PROJECT_ROOT/backend"
cd "$BACKEND_DIR"

# venv 若从服务器拷过来，pip/uvicorn 的 shebang 指向 /var/www/... 在本机不可用，需重建（用 pip 检测，因 pip 是脚本）
if [ -d "venv" ]; then
    if ! ./venv/bin/pip --version >/dev/null 2>&1; then
        echo -e "${BLUE}venv 来自其他环境（如服务器），正在删除并重建...${NC}"
        rm -rf venv
    fi
fi
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Install dependencies
if [ -f "requirements.txt" ]; then
    echo "Installing/Updating Python dependencies..."
    ./venv/bin/pip install -r requirements.txt
else
    echo -e "${RED}Error: requirements.txt not found in backend directory.${NC}"
    exit 1
fi

# Start Backend Server（在子 shell 内固定工作目录，避免 cwd 漂移）
echo "Starting Backend Server (FastAPI) on http://127.0.0.1:8000 ..."
( cd "$BACKEND_DIR" && exec ./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000 ) &
BACKEND_PID=$!

# 等待后端就绪再启动前端，避免首请求 502/500
echo "Waiting for backend to be ready..."
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    if curl -sf http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
        echo "Backend is ready."
        break
    fi
    if [ "$i" -eq 20 ]; then
        echo -e "${RED}Warning: Backend did not respond in 20s. Check terminal for errors.${NC}"
    fi
    sleep 1
done

# --- Frontend Setup ---
echo -e "${GREEN}⚛️  Setting up Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing Frontend dependencies..."
    npm install
fi

# Start Frontend Server
echo "Starting Frontend Server (Vite)..."
npm run dev &
FRONTEND_PID=$!

# --- Wait and Cleanup ---
echo -e "${GREEN}✅ Local environment is running!${NC}"
echo -e "   Frontend: http://localhost:3000 (or as shown in Vite output)"
echo -e "   Backend:  http://localhost:8000"
echo -e "${BLUE}Press Ctrl+C to stop all services.${NC}"
echo -e "${BLUE}若上传图片仍报 500，请查看本终端后端输出的报错（豆包 API 需网络可达）。${NC}"

wait
