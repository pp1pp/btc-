import React from 'react';
import { SignalAnalysis } from '../types';
import { Wallet, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PredictionGaugeProps {
  analysis: SignalAnalysis | null;
}

export const PredictionGauge: React.FC<PredictionGaugeProps> = ({ analysis }) => {
  if (!analysis) return <div className="bg-white rounded-2xl h-full animate-pulse border border-gray-100"></div>;

  const isBuy = analysis.action.includes('BUY');
  const isSell = analysis.action.includes('SELL');
  const isWait = analysis.action === 'WAIT';

  let theme = { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500", accent: "#9ca3af" };
  if (isBuy) theme = { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", accent: "#10b981" };
  if (isSell) theme = { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", accent: "#f43f5e" };

  return (
    <div className={`bg-white border rounded-2xl shadow-sm h-full flex flex-col overflow-hidden ${theme.border}`}>
      
      {/* Signal Output */}
      <div className={`p-4 flex-1 flex flex-col justify-center items-center text-center ${theme.bg}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Quant Strategy Signal</span>
          <div className={`text-2xl font-black tracking-tight ${theme.text}`}>
              {isWait ? "HOLD / WAIT" : analysis.action.replace('_', ' ')}
          </div>
          {analysis.confidence > 0 && (
             <div className="mt-2 text-xs font-medium bg-white/60 px-2 py-0.5 rounded-full border border-black/5">
                 Confidence: {analysis.confidence}%
             </div>
          )}
      </div>

      {/* Kelly Stake Area */}
      <div className="bg-white p-4 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-gray-800 font-bold text-xs">
                  <Wallet size={14} className="text-blue-600"/>
                  Kelly Stake
              </div>
              <span className="font-mono text-xl font-black text-gray-900">
                  {analysis.kellyStake.toFixed(1)}%
              </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
               <div 
                  className="h-full transition-all duration-700"
                  style={{ 
                      width: `${Math.min(analysis.kellyStake * 4, 100)}%`, 
                      backgroundColor: theme.accent 
                  }}
               ></div>
          </div>

          {/* Reason Factors */}
          <div className="space-y-1">
              {analysis.reason.slice(0, 2).map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                      {isWait ? <AlertCircle size={10} /> : <CheckCircle2 size={10} className="text-green-500"/>}
                      <span className="truncate">{r.replace(/✅|⚠️|🎯/g, '').trim()}</span>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};