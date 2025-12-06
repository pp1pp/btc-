import React from 'react';
import { MultiTimeframeData, IndicatorSet } from '../types';

interface TechnicalGridProps {
  data: MultiTimeframeData;
}

const IndicatorCell = ({ label, value, type }: { label: string, value: string | number, type?: 'rsi' | 'trend' | 'macd' }) => {
  let colorClass = "text-gray-900";
  
  if (type === 'rsi') {
    const num = Number(value);
    colorClass = num > 70 ? "text-red-500 font-bold" : num < 30 ? "text-green-500 font-bold" : "text-gray-600";
  }
  
  if (type === 'trend') {
    colorClass = value === 'bullish' ? "text-green-600 bg-green-50 px-2 py-0.5 rounded" : 
                 value === 'bearish' ? "text-red-600 bg-red-50 px-2 py-0.5 rounded" : "text-gray-400 bg-gray-50 px-2 py-0.5 rounded";
  }

  if (type === 'macd') {
    const num = Number(value);
    colorClass = num > 0 ? "text-green-600" : "text-red-600";
  }

  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-400 uppercase font-medium mb-1">{label}</span>
      <span className={`text-sm font-medium ${colorClass}`}>
        {type === 'trend' && value === 'bullish' ? '看涨' : type === 'trend' && value === 'bearish' ? '看跌' : type === 'trend' ? '震荡' : value}
      </span>
    </div>
  );
};

const Row = ({ tf, data }: { tf: string, data: IndicatorSet }) => {
  if (!data) return null; // Safe guard
  return (
    <div className="grid grid-cols-6 gap-4 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50 transition-colors px-2">
      <div className="col-span-1 font-bold text-gray-700 text-sm">{tf}</div>
      <IndicatorCell label="RSI(14)" value={data.rsi?.toFixed(1) || '-'} type="rsi" />
      <IndicatorCell label="MACD" value={data.macd?.toFixed(2) || '-'} type="macd" />
      <IndicatorCell label="ATR" value={data.atr?.toFixed(2) || '-'} />
      <IndicatorCell label="BB带宽" value={data.ma25 ? `${((data.upperBand - data.lowerBand)/data.ma25 * 100).toFixed(2)}%` : '-'} />
      <IndicatorCell label="趋势" value={data.trend} type="trend" />
    </div>
  );
};

export const TechnicalGrid: React.FC<TechnicalGridProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-sm">多周期核心指标监控 (MACD增强版)</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">实时计算</span>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <Row tf="5分钟" data={data['5m']} />
        <Row tf="15分钟" data={data['15m']} />
        <Row tf="1小时" data={data['1h']} />
        <Row tf="4小时" data={data['4h']} />
      </div>
    </div>
  );
};