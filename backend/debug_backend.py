import asyncio
import os
import cv2
import numpy as np
import sys

# Ensure we can import services
sys.path.append(os.getcwd())

from services.evaluation_service import evaluate_suture

async def main():
    print("Starting backend debug test...")
    # Create a dummy image (white background)
    img = 255 * np.ones((500, 500, 3), dtype=np.uint8)
    
    # Draw a ruler-like object (black rect) to pass scale check
    cv2.rectangle(img, (10, 450), (100, 490), (0, 0, 0), -1)
    
    # Draw a wound (black line)
    cv2.line(img, (50, 250), (450, 250), (0, 0, 0), 5) 
    
    # Draw sutures (black lines crossing)
    cv2.line(img, (100, 200), (100, 300), (0, 0, 0), 3)
    cv2.line(img, (250, 200), (250, 300), (0, 0, 0), 3)
    cv2.line(img, (400, 200), (400, 300), (0, 0, 0), 3)
    
    test_file = "test_debug_suture.jpg"
    cv2.imwrite(test_file, img)
    print(f"Created test image: {test_file}")
    
    try:
        print("Calling evaluate_suture...")
        result = await evaluate_suture(test_file)
        print("✅ Success! Result:")
        print(result)
    except Exception as e:
        print("❌ Error occurred:")
        import traceback
        traceback.print_exc()
    finally:
        if os.path.exists(test_file):
            os.remove(test_file)
            print("Cleaned up test file.")

if __name__ == "__main__":
    asyncio.run(main())
