
import { GoogleGenAI } from "@google/genai";
import { AssessmentReport } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const ASSESSMENT_PROMPT = `
你是一个专业的医学外科评估专家AI。
请分析这张包含缝合皮块和刻度尺的图片。

### 任务描述：
1. **识别刻度尺**：识别图片中的物理刻度尺，计算1毫米(mm)对应的像素数量。
2. **识别伤口与缝线**：
   - 伤口：皮块上的黑色长直线。
   - 缝线：缝合伤口的黑色线段。
   - 远点(Far)：缝线距离伤口垂直距离最远的点。
   - 近点(Near)：缝线距离伤口垂直距离最近的点。
3. **计算距离**：
   - 为每个伤口分组计算平均远点距离和平均近点距离（单位：mm）。
4. **进行评分**：
   - 远点评分(AVR-Far)：4mm-8mm为满分10分。每超出或不足该区间2mm，扣2分。
   - 近点评分(AVR-Near)：1mm-2mm为满分10分。每超出或不足该区间1mm，扣2分。
   - 最小分为0分。

### 输出要求：
必须严格按照以下JSON格式返回结果，不要包含任何多余文字：
{
  "version": "1.0",
  "image_id": "filename",
  "timestamp": "ISO-8601 string",
  "scale": { "pixels_per_mm": number },
  "scores": [
    {
      "group_id": number,
      "avr_far_points": { "average_distance_mm": number, "score": number },
      "avr_near_points": { "average_distance_mm": number, "score": number },
      "total_score": number
    }
  ],
  "final_average_score": number
}
`;

export function getMockReport(fileName: string = "demo_suture.jpg"): AssessmentReport {
  return {
    version: "1.0-MOCK",
    image_id: fileName,
    timestamp: new Date().toISOString(),
    scale: { pixels_per_mm: 15.5 },
    scores: [
      { group_id: 1, position: '左端', is_abnormal: false, abnormal_reason: '', avr_far_points: { average_distance_mm: 6.5, score: 10 }, avr_near_points: { average_distance_mm: 1.5, score: 10 }, total_score: 10 },
      { group_id: 2, position: '左中', is_abnormal: false, abnormal_reason: '', avr_far_points: { average_distance_mm: 6.6, score: 10 }, avr_near_points: { average_distance_mm: 2.0, score: 10 }, total_score: 10 },
      { group_id: 3, position: '中央', is_abnormal: false, abnormal_reason: '', avr_far_points: { average_distance_mm: 6.8, score: 10 }, avr_near_points: { average_distance_mm: 2.2, score: 10 }, total_score: 10 },
      { group_id: 4, position: '右中', is_abnormal: true, abnormal_reason: '图像局部模糊，近点难以准确测量', avr_far_points: { average_distance_mm: 9.2, score: 8 }, avr_near_points: { average_distance_mm: 2.8, score: 8 }, total_score: 8 },
      { group_id: 5, position: '右端', is_abnormal: false, abnormal_reason: '', avr_far_points: { average_distance_mm: 6.7, score: 10 }, avr_near_points: { average_distance_mm: 1.8, score: 10 }, total_score: 10 }
    ],
    final_average_score: 9.5,
    valid_count: 4,
    abnormal_count: 1,
    total_count: 5,
    raw_ai_result: {
      sutures: [
        { id: 1, position: '左端', far_point_distance_px: 93, near_point_distance_px: 28, is_abnormal: false, abnormal_reason: '' },
        { id: 2, position: '左中', far_point_distance_px: 95, near_point_distance_px: 32, is_abnormal: false, abnormal_reason: '' },
        { id: 3, position: '中央', far_point_distance_px: 96, near_point_distance_px: 35, is_abnormal: false, abnormal_reason: '' },
        { id: 4, position: '右中', far_point_distance_px: 128, near_point_distance_px: 42, is_abnormal: true, abnormal_reason: '图像局部模糊' },
        { id: 5, position: '右端', far_point_distance_px: 94, near_point_distance_px: 26, is_abnormal: false, abnormal_reason: '' }
      ]
    }
  };
}

export async function analyzeSutureImage(file: File): Promise<AssessmentReport> {
  const API_URL = "http://localhost:8000/api/evaluate";
  
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `请求失败: ${response.status}`);
    }

    return await response.json() as AssessmentReport;
  } catch (e) {
    console.error("Backend API Error, falling back to mock:", e);
    // 接口失败时自动降级到 Mock 数据，保证演示不中断
    return getMockReport(file.name);
  }
}
