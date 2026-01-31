import os
import base64
import json
import traceback
from openai import OpenAI

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

async def analyze_suture_points(image_path: str):
    """
    Sends the image to Volcengine (Doubao) to identify suture points.
    Returns a JSON object with coordinates.
    """
    
    # Configuration for Volcengine Ark
    API_KEY = "404f2706-2817-453f-85c1-fcbf9e14ad6f"
    BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
    MODEL_ID = "doubao-seed-1-6-251015"
    
    # Initialize client with Volcengine config
    client = OpenAI(
        api_key=API_KEY,
        base_url=BASE_URL
    )
    
    try:
        base64_image = encode_image(image_path)
        
        prompt = """
        You are an expert surgical evaluator. Analyze this image of a sutured skin block.
        Identify the wound (the long black line) and the sutures (the black threads crossing it).
        
        Task: Identify exactly 3 representative suture stitches (3 个评分单元): one from the left part, one from the center, one from the right part of the wound. For each, provide near-point and far-point pixel distances.
        
        For each suture provide:
        1. id: 1, 2, or 3.
        2. position: short Chinese, e.g. "左上方" "中央" "右下方".
        3. far_point_distance_px: perpendicular distance from far point to wound line, in pixels.
        4. near_point_distance_px: perpendicular distance from near point (entry/exit) to wound line, in pixels.
        5. is_abnormal: false normally; true only if this suture is blurred, outlier, or incomplete.
        6. abnormal_reason: "" normally; short Chinese reason if is_abnormal is true.
        
        Image scale about 14 px/mm. Typical: far 91–98 px, near 21–42 px. Base on the actual image.
        
        Return ONLY a valid JSON object (no markdown, no explanation):
        {
            "sutures": [
                {"id": 1, "position": "左上方", "far_point_distance_px": 93, "near_point_distance_px": 28, "is_abnormal": false, "abnormal_reason": ""},
                {"id": 2, "position": "中央", "far_point_distance_px": 95, "near_point_distance_px": 32, "is_abnormal": false, "abnormal_reason": ""},
                {"id": 3, "position": "右下方", "far_point_distance_px": 97, "near_point_distance_px": 35, "is_abnormal": false, "abnormal_reason": ""}
            ]
        }
        """

        print(f"Sending request to Volcengine... Model: {MODEL_ID}")
        
        response = client.chat.completions.create(
            model=MODEL_ID,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=2000,
        )
        
        print("Response received from Volcengine.")
        if not response.choices or not response.choices[0].message.content:
            raise ValueError("模型返回为空，请重试或更换图片。")
        content = response.choices[0].message.content
        print(f"Raw content: {content}")
        
        # Clean up markdown if present
        content = content.replace("```json", "").replace("```", "").strip()
        try:
            data = json.loads(content)
        except json.JSONDecodeError as je:
            print(f"JSON 解析失败: {je}. 原始内容: {content[:200]}...")
            raise ValueError(f"模型返回格式异常，无法解析: {str(je)}")
        if not isinstance(data.get("sutures"), list):
            raise ValueError("模型返回中缺少有效的 sutures 数组。")
        return data

    except Exception as e:
        print(f"LLM Error: {e}")
        traceback.print_exc()
        # Re-raise the exception to show the real error instead of mock data
        raise e

# Removed get_mock_data to ensure no fallback to fake data
