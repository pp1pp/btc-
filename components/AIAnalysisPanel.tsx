import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

interface AIAnalysisPanelProps {
  text: string;
  isUpdating: boolean;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ text, isUpdating }) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-6 shadow-sm h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4 z-10">
        <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-blue-200 shadow-lg">
           <Bot size={18} />
        </div>
        <h3 className="font-bold text-gray-800 text-sm">AI 市场洞察引擎</h3>
        {isUpdating && (
          <span className="flex h-2 w-2 relative ml-auto">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto z-10">
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line animate-in fade-in duration-500">
          {text || "正在初始化多维度分析模型..."}
        </p>
      </div>

      <div className="mt-4 flex gap-2 z-10">
         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
           <Sparkles className="w-3 h-3 mr-1" /> 多因子分析
         </span>
         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
           NLP 处理中
         </span>
      </div>

      {/* Background Decor */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl z-0"></div>
    </div>
  );
};