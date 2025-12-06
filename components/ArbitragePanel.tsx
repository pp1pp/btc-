import React from 'react';
import { ArbitrageState } from '../types';
import { Target, Scale, Zap, ArrowRight, DollarSign } from 'lucide-react';

interface ArbitragePanelProps {
    arb: ArbitrageState | null;
}

export const ArbitragePanel: React.FC<ArbitragePanelProps> = ({ arb }) => {
    if (!arb) return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm h-full flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
            <Scale size={24} className="animate-bounce opacity-50"/>
            <span className="animate-pulse">正在计算 Z-Score 概率差...</span>
        </div>
    );

    const evPercent = arb.ev * 100;
    const isGoodTrade = arb.ev > 0.05; // Positive EV
    const isBadTrade = arb.ev < -0.05; // Overpriced (Short Opportunity)
    
    const marketProb = arb.polymarketPrice * 100;
    const modelProb = arb.theoreticalProb * 100;
    const spread = modelProb - marketProb;

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-0 shadow-sm h-full flex flex-col overflow-hidden">
            {/* Top Bar: Market Info */}
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 text-white p-1 rounded-md">
                        <Target size={14} />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Target Market</div>
                        <div className="font-bold text-gray-800 text-xs leading-none truncate max-w-[200px]" title={arb.polymarketTitle}>
                            BTC {'>'} ${arb.strikePrice.toLocaleString()}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-gray-400 font-mono">IV: {(arb.impliedVolatility * 100).toFixed(0)}%</div>
                </div>
            </div>

            {/* Core Visualization: The Gap */}
            <div className="flex-1 p-5 flex items-center justify-center gap-6">
                
                {/* 1. Market Price */}
                <div className="text-center opacity-70">
                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Market Price</div>
                    <div className="text-2xl font-mono font-bold text-gray-600">
                        {marketProb.toFixed(1)}<span className="text-sm">¢</span>
                    </div>
                </div>

                {/* 2. The Spread Arrow */}
                <div className="flex-1 flex flex-col items-center">
                    <div className={`relative w-full h-12 flex items-center justify-center rounded-xl border-2 ${spread > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        {spread > 0 && <Zap size={16} className="text-green-500 absolute left-3 animate-pulse"/>}
                        <span className={`text-xl font-black font-mono ${spread > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {spread > 0 ? '+' : ''}{spread.toFixed(1)}%
                        </span>
                        <span className="absolute -bottom-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {spread > 0 ? 'Underpriced' : 'Overpriced'}
                        </span>
                    </div>
                </div>

                {/* 3. Model Price */}
                <div className="text-center">
                    <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">Fair Value</div>
                    <div className="text-3xl font-mono font-black text-blue-600">
                        {modelProb.toFixed(1)}<span className="text-lg">¢</span>
                    </div>
                </div>
            </div>

            {/* Bottom Bar: EV Summary */}
            <div className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-widest opacity-60">Expected Value (EV)</span>
                    <span className={`text-lg font-mono font-bold ${isGoodTrade ? 'text-green-400' : isBadTrade ? 'text-red-400' : 'text-gray-400'}`}>
                        {evPercent > 0 ? '+' : ''}{evPercent.toFixed(2)}%
                    </span>
                </div>
                <div className="h-6 w-px bg-gray-700 mx-2"></div>
                <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase tracking-widest opacity-60">Recommended Action</span>
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                        {isGoodTrade ? 'LONG (YES)' : isBadTrade ? 'SHORT (NO)' : 'WAIT'}
                    </span>
                </div>
            </div>
        </div>
    );
};