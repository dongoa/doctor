import os
import shutil
import uuid
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from services.evaluation_service import evaluate_suture

app = FastAPI(title="SutureAI API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp directory（使用绝对路径，避免工作目录变化导致读图失败）
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/api/evaluate")
async def evaluate_image(file: UploadFile = File(...)):
    try:
        # Save to temp file
        file_ext = os.path.splitext(file.filename)[1]
        if not file_ext:
            file_ext = ".jpg"
        
        temp_filename = f"{uuid.uuid4()}{file_ext}"
        temp_path = os.path.join(TEMP_DIR, temp_filename)
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Process image
        result = await evaluate_suture(temp_path)
        
        # Cleanup
        # os.remove(temp_path) # Keep for debugging for now
        
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
