import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, subValue, trend, accentColor = "text-gray-900" }) => {
  return (
    <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-2">
        <span className="text-gray-400 text-xs font-semibold tracking-wider">{label}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className={`text-2xl font-bold tracking-tight ${accentColor}`}>
          {value}
        </span>
        {subValue && (
          <span className={`text-sm font-medium mb-1 ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 'text-gray-400'
          }`}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : ''} {subValue}
          </span>
        )}
      </div>
    </div>
  );
};