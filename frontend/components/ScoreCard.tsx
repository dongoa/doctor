
import React from 'react';
import { AssessmentReport } from '../types';

interface ScoreCardProps {
  report: AssessmentReport;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ report }) => {
  const getScoreColorClass = (score: number) => {
    if (score >= 9) return 'from-emerald-400 to-emerald-600 shadow-emerald-200';
    if (score >= 7) return 'from-blue-400 to-blue-600 shadow-blue-200';
    return 'from-amber-400 to-amber-600 shadow-amber-200';
  };

  const getTextColor = (score: number) => {
    if (score >= 9) return 'text-emerald-600';
    if (score >= 7) return 'text-blue-600';
    return 'text-amber-600';
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header Section */}
      <div className="glass-card rounded-[2rem] p-10 flex flex-col lg:flex-row items-center justify-between gap-10">
        <div className="space-y-4 text-center lg:text-left">
          <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
            评估已完成
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">技能评估总览</h2>
          <p className="text-slate-500 font-medium max-w-sm">基于多维空间的 AI 定量算法，为您生成的缝合质量结构化分析报告。</p>
          
          <div className="flex flex-wrap justify-center lg:justify-start gap-6 pt-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">系统版本</span>
              <span className="text-sm font-bold text-slate-700">{report.version}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">校准比例</span>
              <span className="text-sm font-bold text-slate-700">{report.scale.pixels_per_mm.toFixed(2)} 像素/毫米</span>
            </div>
            {report.total_count != null && (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">有效 / 总数</span>
                <span className="text-sm font-bold text-slate-700">
                  {report.valid_count ?? report.scores.length} / {report.total_count}
                  {(report.abnormal_count ?? 0) > 0 && (
                    <span className="text-amber-600 ml-1">（异常 {report.abnormal_count} 条已排除）</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="relative group">
           <div className={`absolute inset-0 blur-3xl opacity-20 bg-gradient-to-br ${getScoreColorClass(report.final_average_score)}`}></div>
           <div className="relative w-48 h-48 bg-white rounded-full border-[12px] border-slate-50 shadow-inner flex flex-col items-center justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">评分指数</span>
              <span className={`text-6xl font-black tracking-tighter ${getTextColor(report.final_average_score)}`}>
                {report.final_average_score.toFixed(1)}
              </span>
           </div>
        </div>
      </div>

      {/* Grid of details（支持多条缝线，异常数据标出） */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {report.scores.map((group, idx) => (
          <div
            key={group.group_id}
            className={`glass-card rounded-3xl p-8 border transition-all duration-300 ${
              group.is_abnormal ? 'border-amber-200 hover:border-amber-300 bg-amber-50/30' : 'border-white hover:border-blue-100'
            }`}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-1 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <span className="font-bold text-slate-800">评分单元 #{group.group_id}</span>
                  {group.is_abnormal && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">异常</span>
                  )}
                </div>
                {group.position && (
                  <span className="text-xs font-medium text-slate-500 ml-12 sm:ml-0">
                    图中位置：{group.position}
                  </span>
                )}
              </div>
              <div className={`text-xl font-black ${getTextColor(group.total_score)}`}>
                {Number.isInteger(group.total_score) ? group.total_score : group.total_score.toFixed(1)}
              </div>
            </div>
            {group.is_abnormal && group.abnormal_reason && (
              <p className="text-xs text-amber-700 mb-4 bg-amber-50 px-3 py-2 rounded-lg">异常说明：{group.abnormal_reason}</p>
            )}

            <div className="space-y-6">
              {/* Metric 1 */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>远点平均跨度 (AVR-Far)</span>
                  <span className="text-slate-800">{group.avr_far_points.average_distance_mm.toFixed(2)} 毫米</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                    className={`h-full bg-gradient-to-r transition-all duration-1000 ease-out ${getScoreColorClass(group.avr_far_points.score)}`}
                    style={{ width: `${group.avr_far_points.score * 10}%` }}
                   />
                </div>
              </div>

              {/* Metric 2 */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>近点出针精度 (AVR-Near)</span>
                  <span className="text-slate-800">{group.avr_near_points.average_distance_mm.toFixed(2)} 毫米</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                    className={`h-full bg-gradient-to-r transition-all duration-1000 ease-out ${getScoreColorClass(group.avr_near_points.score)}`}
                    style={{ width: `${group.avr_near_points.score * 10}%` }}
                   />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* RAW JSON - Professional Code Block */}
      <div className="rounded-3xl bg-slate-900 p-8 shadow-2xl">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
               <div className="flex space-x-1.5">
                  <div className="w-3 h-3 bg-red-500/20 rounded-full"></div>
                  <div className="w-3 h-3 bg-amber-500/20 rounded-full"></div>
                  <div className="w-3 h-3 bg-emerald-500/20 rounded-full"></div>
               </div>
               <span className="ml-4 text-slate-500 font-mono text-xs font-bold uppercase tracking-widest">元数据终端 (JSON)</span>
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(JSON.stringify(report, null, 2))}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg"
            >
              复制数据
            </button>
         </div>
         <pre className="font-mono text-[11px] text-blue-400/80 overflow-x-auto max-h-80 custom-scrollbar leading-relaxed">
            {JSON.stringify(report, null, 2)}
         </pre>
      </div>
    </div>
  );
};

export default ScoreCard;
