import os
import datetime
from .image_utils import calculate_scale
from .llm_service import analyze_suture_points

def _get_px(suture: dict, key_snake: str, key_camel: str, default: float = 50.0) -> float:
    """兼容 LLM 返回的 snake_case 或 camelCase 字段"""
    val = suture.get(key_snake) or suture.get(key_camel)
    if val is None:
        return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default

async def evaluate_suture(image_path: str):
    # 确保使用绝对路径，避免工作目录导致的读图失败
    image_path = os.path.abspath(image_path)
    # 1. Calculate Scale
    pixels_per_mm = calculate_scale(image_path)
    
    # 2. Get Points from LLM
    llm_result = await analyze_suture_points(image_path)
    sutures = llm_result.get("sutures", [])
    
    if not sutures:
        raise ValueError("LLM 未识别到任何缝线数据，请确保图片包含清晰伤口与缝线。")
    
    # 3. Calculate Scores（本版本评分标准）
    # 不足不扣，够了（超出）才扣。每条缝线按规则单独计分；异常数据参与计分但最终平均分仅基于非异常数据。
    # 远点 (AVR-Far): ≤8mm 满分10分；>8mm 时每超出 2mm 扣 2 分。
    # 近点 (AVR-Near): ≤2mm 满分10分；>2mm 时每超出 1mm 扣 2 分。
    # 每组最终得分 = (远点得分 + 近点得分) / 2，取整。
    scores = []
    total_score_sum_valid = 0  # 仅非异常条目的得分之和
    valid_count = 0

    for suture in sutures:
        # 异常标记（AI 返回）
        is_abnormal = bool(suture.get("is_abnormal") or suture.get("abnormal"))
        abnormal_reason = suture.get("abnormal_reason") or suture.get("abnormal_reason_cn") or ""

        # Convert pixels to mm（兼容 snake_case / camelCase）
        far_px = _get_px(suture, "far_point_distance_px", "farPointDistancePx")
        near_px = _get_px(suture, "near_point_distance_px", "nearPointDistancePx")
        far_dist_mm = far_px / pixels_per_mm
        near_dist_mm = near_px / pixels_per_mm

        # AVR-Far: 4mm~8mm 满分10分；不足不扣，仅超出 8mm 时每 2mm 扣 2 分。得分取整。
        far_score = 10
        if far_dist_mm > 8:
            diff = far_dist_mm - 8
            deduction = (diff / 2) * 2
            far_score -= deduction
        far_score = int(round(max(0, min(10, far_score)), 0))

        # AVR-Near: 1mm~2mm 满分10分；不足不扣，仅超出 2mm 时每 1mm 扣 2 分。得分取整。
        near_score = 10
        if near_dist_mm > 2:
            diff = near_dist_mm - 2
            deduction = (diff / 1) * 2
            near_score -= deduction
        near_score = int(round(max(0, min(10, near_score)), 0))

        # 每组最终得分 = (远点得分 + 近点得分) / 2，取整后每组为整数分
        group_score = (far_score + near_score) / 2
        group_score_int = int(round(group_score, 0))
        if not is_abnormal:
            total_score_sum_valid += group_score_int
            valid_count += 1

        group_id = suture.get("id") or suture.get("group_id") or len(scores) + 1
        position = suture.get("position") or suture.get("location") or ""
        scores.append({
            "group_id": group_id,
            "position": position,
            "is_abnormal": is_abnormal,
            "abnormal_reason": abnormal_reason,
            "avr_far_points": {
                "average_distance_mm": round(far_dist_mm, 2),
                "score": far_score
            },
            "avr_near_points": {
                "average_distance_mm": round(near_dist_mm, 2),
                "score": near_score
            },
            "total_score": group_score_int
        })

    # 最终平均分：仅基于非异常数据；若全部异常则用全部数据
    if valid_count > 0:
        final_average = total_score_sum_valid / valid_count
    elif scores:
        final_average = sum(s["total_score"] for s in scores) / len(scores)
    else:
        final_average = 0

    abnormal_count = sum(1 for s in scores if s.get("is_abnormal"))

    # 4. Construct Report（含 AI 原始结果供前端日志展示）
    report = {
        "version": "1.0",
        "image_id": os.path.basename(image_path),
        "timestamp": datetime.datetime.now().isoformat(),
        "scale": {
            "pixels_per_mm": pixels_per_mm
        },
        "scores": scores,
        "final_average_score": round(final_average, 1),
        "valid_count": valid_count,
        "abnormal_count": abnormal_count,
        "total_count": len(scores),
        "raw_ai_result": llm_result,
    }
    
    return report
