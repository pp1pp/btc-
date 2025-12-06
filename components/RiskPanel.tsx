import React, { useState } from 'react';
import { ArbitrageState } from '../types';
import { Shield, RefreshCw, AlertOctagon } from 'lucide-react';

interface RiskPanelProps {
  arb: ArbitrageState | null;
}

export const RiskPanel: React.FC<RiskPanelProps> = ({ arb }) => {
  const [hedgeAmount, setHedgeAmount] = useState<string>("1000");

  if (!arb) return <div className="bg-gray-50 h-full rounded-2xl animate-pulse"></div>;

  // Oracle Spread Check
  const spreadAbs = Math.abs(arb.oracleSpread);
  const isOracleRisk = spreadAbs > 20; // >$20 diff is risky for binary options near strike
  
  // Hedge Calculation (Simple Delta Neutral)
  // If we are LONG Polymarket (betting YES/Up), we are essentially Long BTC Delta.
  // To hedge, we Short BTC Futures.
  // Amount = Stake size. 
  const amountVal = parseFloat(hedgeAmount) || 0;
  const leverage = 20;
  const marginReq = amountVal / leverage;
  const contractSizeBTC = amountVal / arb.binancePrice;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <Shield size={16} className="text-purple-600"/>
          结算风控 & 对冲
        </h3>
        {isOracleRisk && (
            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                <AlertOctagon size={10} /> 结算源异常
            </span>
        )}
      </div>

      {/* Oracle Radar */}
      <div className="grid grid-cols-2 gap-2 mb-4">
         <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-[10px] text-gray-400 block">Binance (主)</span>
            <span className="font-mono text-xs font-bold">${arb.binancePrice.toFixed(1)}</span>
         </div>
         <div className="bg-gray-50 p-2 rounded-lg relative">
            <span className="text-[10px] text-gray-400 block">Coinbase (辅)</span>
            <span className="font-mono text-xs font-bold">${arb.coinbasePrice.toFixed(1)}</span>
            <div className={`absolute top-2 right-2 text-[10px] font-mono ${isOracleRisk ? 'text-red-500' : 'text-green-500'}`}>
                Diff: {arb.oracleSpread.toFixed(1)}
            </div>
         </div>
      </div>

      {/* Hedge Calculator */}
      <div className="border-t border-gray-100 pt-3">
         <div className="flex justify-between items-center mb-2">
             <span className="text-xs font-bold text-gray-700">一键合成对冲</span>
             <span className="text-[10px] text-gray-400">Binance Futures</span>
         </div>
         
         <div className="flex gap-2 mb-2">
             <div className="relative flex-1">
                <span className="absolute left-2 top-1.5 text-xs text-gray-400">$</span>
                <input 
                    type="number" 
                    value={hedgeAmount}
                    onChange={(e) => setHedgeAmount(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1 pl-5 pr-2 text-xs font-mono focus:outline-none focus:border-purple-500"
                />
             </div>
             <button className="bg-purple-600 text-white text-xs px-3 rounded-lg font-bold hover:bg-purple-700 transition-colors">
                 计算
             </button>
         </div>

         <div className="text-[10px] text-gray-500 space-y-1">
            <div className="flex justify-between">
                <span>需开空单 (Hedge Short):</span>
                <span className="font-mono text-gray-900">{contractSizeBTC.toFixed(4)} BTC</span>
            </div>
            <div className="flex justify-between">
                <span>占用保证金 (20x):</span>
                <span className="font-mono text-gray-900">${marginReq.toFixed(2)}</span>
            </div>
         </div>
      </div>
    </div>
  );
};