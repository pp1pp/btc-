import React from 'react';
import { OrderBook } from '../types';

interface OrderBookWidgetProps {
    depth: OrderBook | null;
    cvd: number;
}

export const OrderBookWidget: React.FC<OrderBookWidgetProps> = ({ depth, cvd }) => {
    if (!depth) return <div className="animate-pulse bg-gray-100 h-full w-full rounded-2xl"></div>;

    // Calculate max amount for bar width
    const maxBid = Math.max(...depth.bids.map(b => b.amount), 0.1);
    const maxAsk = Math.max(...depth.asks.map(a => a.amount), 0.1);
    const maxVol = Math.max(maxBid, maxAsk);

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 h-full flex flex-col text-xs overflow-hidden">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-700">深度 & CVD</h3>
                <span className={`font-mono font-bold ${cvd > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    CVD: {cvd > 0 ? '+' : ''}{cvd.toFixed(2)}
                </span>
            </div>

            <div className="flex-1 flex gap-2 min-h-0">
                {/* Bids */}
                <div className="flex-1 flex flex-col gap-0.5">
                    {depth.bids.slice(0, 8).map((bid, i) => (
                        <div key={i} className="relative flex justify-between items-center h-5 px-1">
                            <div className="absolute right-0 top-0 bottom-0 bg-green-100 rounded-l-sm transition-all duration-300" 
                                 style={{ width: `${(bid.amount / maxVol) * 100}%` }}></div>
                            <span className="relative z-10 text-green-700 font-mono">{bid.price.toFixed(0)}</span>
                            <span className="relative z-10 text-gray-500">{bid.amount.toFixed(3)}</span>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div className="w-px bg-gray-100"></div>

                {/* Asks */}
                <div className="flex-1 flex flex-col gap-0.5">
                    {depth.asks.slice(0, 8).map((ask, i) => (
                        <div key={i} className="relative flex justify-between items-center h-5 px-1">
                            <div className="absolute left-0 top-0 bottom-0 bg-red-100 rounded-r-sm transition-all duration-300" 
                                 style={{ width: `${(ask.amount / maxVol) * 100}%` }}></div>
                            <span className="relative z-10 text-gray-500">{ask.amount.toFixed(3)}</span>
                            <span className="relative z-10 text-red-700 font-mono">{ask.price.toFixed(0)}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="mt-2 text-[10px] text-gray-400 text-center">
                Binance OrderBook (Top 10)
            </div>
        </div>
    );
};
