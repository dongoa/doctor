
import React, { useState, useCallback } from 'react';
import { AppState, AssessmentReport } from './types';
import { analyzeSutureImage, getMockReport } from './services/evaluationService';
import FileUpload from './components/FileUpload';
import ScoreCard from './components/ScoreCard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [report, setReport] = useState<AssessmentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    setError(null);
    setReport(null);
    setState(AppState.UPLOADING);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      
      try {
        setState(AppState.ANALYZING);
        const result = await analyzeSutureImage(file);
        setReport(result);
        setState(AppState.RESULT);
      } catch (err: any) {
        console.error(err);
        setError(err.message || '分析过程中发生错误，请重试。');
        setState(AppState.ERROR);
      }
    };
    reader.onerror = () => {
      setError('无法读取图片文件。');
      setState(AppState.ERROR);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUseMock = () => {
    setError(null);
    setState(AppState.ANALYZING);
    setTimeout(() => {
      const mock = getMockReport();
      setReport(mock);
      setState(AppState.RESULT);
    }, 1500);
  };

  const reset = () => {
    setState(AppState.IDLE);
    setReport(null);
    setError(null);
    setPreviewUrl(null);
  };

  return (
    <div className="min-h-screen selection:bg-blue-100">
      {/* High-end Nav */}
      <nav className="h-20 bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-200">
              <i className="fas fa-microchip text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-tight">SmartSuture AI</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">手术技能分析引擎</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-10">
             <div className="flex flex-col text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">分析模型</span>
                <span className="text-sm font-bold text-slate-700">智能缝合分析</span>
             </div>
             <button 
                onClick={reset}
                className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all"
                title="重置页面"
             >
                <i className="fas fa-sync-alt"></i>
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left: Imaging Station */}
          <div className="lg:col-span-5 space-y-8">
            <div className="group relative overflow-hidden rounded-[2.5rem] bg-white p-4 shadow-2xl shadow-slate-100 border border-slate-50 transition-all duration-700">
              <div className="aspect-[3/4] bg-slate-50 rounded-[2rem] overflow-hidden flex items-center justify-center relative">
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover" alt="缝合样本" />
                ) : (
                  <div className="text-center p-12 space-y-6">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm mx-auto flex items-center justify-center text-slate-200">
                       <i className="fas fa-image text-3xl"></i>
                    </div>
                    <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">等待上传图像数据</p>
                  </div>
                )}
                
                {/* AI Scan Overlay */}
                {state === AppState.ANALYZING && (
                  <>
                    <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[2px]"></div>
                    <div className="absolute top-0 left-0 w-full scan-line"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="bg-white/90 px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-widest">正在量化分析指标...</span>
                       </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Protocol Card */}
            <div className="glass-card rounded-[2.5rem] p-8 border-blue-50">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
                  <i className="fas fa-list-ul mr-3 text-blue-500"></i> 评估协议与标准
               </h3>
               <div className="space-y-6">
                  {[
                    { title: "AVR-Far 远点标准", desc: "目标区间: 4.0mm - 8.0mm", icon: "fa-arrows-left-right" },
                    { title: "AVR-Near 近点标准", desc: "目标区间: 1.0mm - 2.0mm", icon: "fa-compress" },
                    { title: "自动校准系统", desc: "基于物理刻度尺的像素转换", icon: "fa-ruler" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start space-x-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-500">
                          <i className={`fas ${item.icon} text-xs`}></i>
                       </div>
                       <div>
                          <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">{item.title}</p>
                          <p className="text-[11px] font-medium text-slate-400">{item.desc}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Right: Operations & Results */}
          <div className="lg:col-span-7">
            {state === AppState.IDLE && (
              <div className="space-y-8 animate-fadeIn">
                <div className="bg-slate-900 rounded-[2.5rem] p-12 text-white relative overflow-hidden group">
                   <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-110"></div>
                   <div className="relative z-10 space-y-4">
                      <h2 className="text-4xl font-black tracking-tighter">开始智能评估</h2>
                      <p className="text-slate-400 font-medium max-w-md">上传高精度手术皮块图像。AI 将自动执行边缘检测、比例校准及缝合参数计算。</p>
                   </div>
                </div>

                <FileUpload onFileSelect={handleFileSelect} isLoading={false} />
                
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-slate-300"><span className="bg-white px-4">演示与开发模式</span></div>
                </div>

                <button 
                  onClick={handleUseMock}
                  className="w-full py-6 px-8 border-2 border-slate-100 rounded-[1.5rem] text-slate-500 font-black uppercase tracking-widest text-[11px] hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center space-x-3 bg-white hover:shadow-xl hover:shadow-blue-50 group"
                >
                  <i className="fas fa-rocket text-xs transition-transform group-hover:-translate-y-1"></i>
                  <span>启动演示评估 (查看样本结果)</span>
                </button>
              </div>
            )}

            {(state === AppState.UPLOADING || state === AppState.ANALYZING) && (
              <div className="glass-card rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center space-y-10 animate-pulse">
                <div className="w-32 h-32 relative">
                   <div className="absolute inset-0 border-4 border-blue-50 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fas fa-dna text-3xl text-blue-500"></i>
                   </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">技能定量分析中</h3>
                  <p className="text-slate-400 font-medium">深度卷积网络正在处理像素矩阵并提取空间特征...</p>
                </div>
                <div className="w-full max-w-xs h-1 bg-slate-50 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 w-1/3 animate-[loading_2s_infinite]"></div>
                </div>
              </div>
            )}

            {state === AppState.ERROR && (
              <div className="bg-red-50 rounded-[2.5rem] p-12 border border-red-100 text-center space-y-6">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-red-500 mx-auto shadow-xl shadow-red-100">
                  <i className="fas fa-shield-virus text-3xl"></i>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-red-900 tracking-tighter">分析已中断</h3>
                  <p className="text-red-700/60 font-medium text-sm">{error}</p>
                </div>
                <div className="flex gap-4 justify-center pt-4">
                  <button onClick={reset} className="px-8 py-3 bg-white border border-red-100 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all">重新上传</button>
                  <button onClick={handleUseMock} className="px-8 py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">切换演示模式</button>
                </div>
              </div>
            )}

            {state === AppState.RESULT && report && (
              <ScoreCard report={report} />
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-8 py-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
            &copy; 2026 SmartSuture AI 实验室. 保留所有权利.
         </div>
         <div className="flex space-x-6 text-slate-300">
            <i className="fab fa-github hover:text-slate-900 transition-colors cursor-pointer"></i>
            <i className="fas fa-globe-asia hover:text-slate-900 transition-colors cursor-pointer"></i>
         </div>
      </footer>
    </div>
  );
};

export default App;
