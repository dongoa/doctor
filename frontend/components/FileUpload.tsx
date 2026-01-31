
import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files?.[0]) onFileSelect(e.dataTransfer.files[0]); }}
      onClick={() => !isLoading && fileInputRef.current?.click()}
      className={`group relative overflow-hidden rounded-3xl p-1 px-1 transition-all duration-500
        ${isDragging ? 'bg-blue-500' : 'bg-slate-200'}
        ${isLoading ? 'opacity-50' : 'cursor-pointer hover:scale-[1.01]'}`}
    >
      <div className="bg-white rounded-[calc(1.5rem-2px)] p-12 flex flex-col items-center justify-center space-y-6">
        <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} accept="image/*" className="hidden" />
        
        <div className="relative">
          <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:rotate-6">
             <i className={`fas ${isLoading ? 'fa-circle-notch fa-spin' : 'fa-crosshairs'} text-4xl text-slate-400 group-hover:text-blue-500 transition-colors`}></i>
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full border-4 border-white"></div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">导入分析样本</h3>
          <p className="text-slate-400 font-medium">拖拽高分辨率缝合图像或点击浏览</p>
        </div>

        <div className="flex items-center space-x-6 pt-4">
          <div className="flex flex-col items-center space-y-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-300">支持格式</span>
            <span className="text-xs font-bold text-slate-500">RAW / JPG / PNG</span>
          </div>
          <div className="w-px h-8 bg-slate-100"></div>
          <div className="flex flex-col items-center space-y-1">
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-300">分辨率</span>
            <span className="text-xs font-bold text-slate-500">自动缩放校准</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
