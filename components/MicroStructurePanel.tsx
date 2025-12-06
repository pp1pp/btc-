import React from 'react';
import { MicroStructureState, OrderBook } from '../types';
import { BarChart2, AlertTriangle, Activity, Zap } from 'lucide-react';

interface MicroStructurePanelProps {
  depth: OrderBook | null;
  cvd: number;
  cvdDivergence: 'NONE' | 'BULL_TRAP' | 'BEAR_TRAP';
}

export const MicroStructurePanel: React.FC<MicroStructurePanelProps> = ({ depth, cvd, cvdDivergence }) => {
  const obi = depth?.obi || 0;
  
  // OBI Visualization (-1 to 1)
  // Clamp 5-95 for visual so the bar doesn't disappear at edges
  const obiPercent = Math.min(Math.max((obi + 1) / 2 * 100, 5), 95); 
  
  // Dynamic Styling Logic
  let signal = "多空均衡";
  let barColor = "bg-slate-400";
  let signalColor = "text-slate-500";
  let glowEffect = "";

  // Bullish side
  if (obi >= 0.05) {
      signal = "买方略强";
      barColor = "bg-emerald-400";
      signalColor = "text-emerald-600";
  }
  if (obi >= 0.25) {
      signal = "多头主导";
      barColor = "bg-emerald-500";
      signalColor = "text-emerald-700 font-bold";
      glowEffect = "shadow-[0_0_8px_rgba(16,185,129,0.6)]";
  }
  if (obi >= 0.5) {
      signal = "极度贪婪";
      barColor = "bg-emerald-600";
      signalColor = "text-emerald-800 font-black";
      glowEffect = "shadow-[0_0_12px_rgba(5,150,105,0.8)] animate-pulse";
  }

  // Bearish side
  if (obi <= -0.05) {
      signal = "卖方略强";
      barColor = "bg-rose-400";
      signalColor = "text-rose-600";
  }
  if (obi <= -0.25) {
      signal = "空头主导";
      barColor = "bg-rose-500";
      signalColor = "text-rose-700 font-bold";
      glowEffect = "shadow-[0_0_8px_rgba(244,63,94,0.6)]";
  }
  if (obi <= -0.5) {
      signal = "极度恐慌";
      barColor = "bg-rose-600";
      signalColor = "text-rose-800 font-black";
      glowEffect = "shadow-[0_0_12px_rgba(225,29,72,0.8)] animate-pulse";
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <Activity size={16} className="text-blue-600"/>
          微观结构 (Order Flow)
        </h3>
        {cvdDivergence !== 'NONE' && (
           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse flex items-center gap-1 ${cvdDivergence === 'BULL_TRAP' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
             <AlertTriangle size={10} />
             {cvdDivergence === 'BULL_TRAP' ? 'Bull Trap' : 'Bear Trap'}
           </span>
        )}
      </div>

      {/* OBI Gauge (Enhanced Slider) */}
      <div className="mb-4">
           <div className="flex justify-between text-[10px] text-gray-400 mb-1.5 uppercase font-medium items-end">
              <span>Sell Wall</span>
              <span className={`${signalColor} text-xs transition-colors duration-300 flex items-center gap-1`}>
                {Math.abs(obi) > 0.5 && <Zap size={10} className="animate-bounce" />}
                {signal}
              </span>
              <span>Buy Wall</span>
           </div>
           
           <div className="h-4 bg-gray-100 rounded-full relative overflow-hidden shadow-inner ring-1 ring-gray-200/50">
              {/* Gradient Track Background */}
              <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-rose-200 via-slate-100 to-emerald-200"></div>
              
              {/* Center Marker */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-300 z-0"></div>
              
              {/* Active Puck */}
              <div 
                 className={`absolute top-0 bottom-0 w-3 h-4 rounded-full transition-all duration-500 ease-out border-2 border-white cursor-pointer ${barColor} ${glowEffect}`}
                 style={{ left: `calc(${obiPercent}% - 6px)` }}
              ></div>
           </div>
           
           <div className="flex justify-between text-[9px] text-gray-400 mt-1 font-mono tracking-tighter">
               <span>-1.0</span>
               <span className="text-gray-300">OBI: {obi > 0 ? '+' : ''}{obi.toFixed(2)}</span>
               <span>+1.0</span>
           </div>
      </div>

      {/* CVD Block */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CVD Net Flow</span>
              <span className={`text-sm font-black font-mono ${cvd > 0 ? 'text-emerald-600' : cvd < 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                 {cvd > 0 ? '+' : ''}{cvd.toFixed(2)}
              </span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50 z-10"></div>
              {/* Bearish side fill */}
              <div className="flex-1 flex justify-end bg-slate-200">
                  <div 
                    className="bg-rose-500 transition-all duration-700 h-full rounded-l-full" 
                    style={{ width: cvd < 0 ? '100%' : '0%', opacity: cvd < 0 ? Math.min(Math.abs(cvd)/10, 1) : 0 }}
                  ></div>
              </div>
              {/* Bullish side fill */}
              <div className="flex-1 flex justify-start bg-slate-200">
                  <div 
                    className="bg-emerald-500 transition-all duration-700 h-full rounded-r-full" 
                    style={{ width: cvd > 0 ? '100%' : '0%', opacity: cvd > 0 ? Math.min(Math.abs(cvd)/10, 1) : 0 }}
                  ></div>
              </div>
          </div>
      </div>
    </div>
  );
};