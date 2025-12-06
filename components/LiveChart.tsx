import React from 'react';
import { AreaChart, Area, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, XAxis } from 'recharts';

interface LiveChartProps {
  data: { timestamp: number; value: number }[];
  strikePrice?: number;
}

export const LiveChart: React.FC<LiveChartProps> = ({ data, strikePrice }) => {
  if (!data || data.length === 0) return <div className="h-full w-full bg-gray-50 rounded-xl animate-pulse"></div>;

  const currentPrice = data[data.length - 1].value;
  const min = Math.min(...data.map(d => d.value), strikePrice || Infinity);
  const max = Math.max(...data.map(d => d.value), strikePrice || -Infinity);
  
  // Calculate padding dynamically to keep lines visible
  const padding = (max - min) * 0.15;
  const domainMin = min - padding;
  const domainMax = max + padding;

  // Dynamic Color: Green if Price > Strike (Winning "Yes"), Red if Price < Strike
  const isWinning = strikePrice ? currentPrice > strikePrice : true;
  const mainColor = isWinning ? "#10b981" : "#ef4444"; // Emerald-500 or Red-500

  return (
    <div className="h-full w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={mainColor} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={mainColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="timestamp" 
            type="number" 
            domain={['dataMin', 'dataMax']} 
            hide 
          />
          <YAxis 
            domain={[domainMin, domainMax]} 
            hide 
          />
          <Tooltip 
             contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', fontSize: '12px' }}
             itemStyle={{ color: '#f3f4f6' }}
             formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
             labelFormatter={(label) => new Date(label).toLocaleTimeString()}
          />
          
          {strikePrice && (
            <ReferenceLine 
                y={strikePrice} 
                stroke="#6366f1" 
                strokeDasharray="3 3" 
                strokeWidth={1.5}
                label={{ 
                    position: 'right', 
                    value: `Strike: $${strikePrice}`, 
                    fill: '#6366f1', 
                    fontSize: 10,
                    fontWeight: 600
                }} 
            />
          )}

          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={mainColor} 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorValue)" 
            isAnimationActive={false}
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};