// Technical Analysis Utility
import { Candle, IndicatorSet } from '../types';

export const calculateSMA = (data: number[], period: number): number => {
  if (data.length < period) return 0;
  // Use a simple loop for speed over slice+reduce
  let sum = 0;
  for (let i = data.length - period; i < data.length; i++) {
    sum += data[i];
  }
  return sum / period;
};

export const calculateEMA = (data: number[], period: number, prevEMA?: number): number => {
  if (data.length === 0) return 0;
  const k = 2 / (period + 1);
  const price = data[data.length - 1];
  
  if (prevEMA === undefined) {
    return calculateSMA(data, period); // Initial SMA
  }
  return price * k + prevEMA * (1 - k);
};

export const calculateRSI = (data: number[], period: number = 14): number => {
  if (data.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = data.length - period; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const calculateBollinger = (data: number[], period: number = 20, multiplier: number = 2) => {
  if (data.length < period) return { upper: 0, lower: 0, middle: 0 };
  
  const sma = calculateSMA(data, period);
  // Manual variance calc
  let sumSqDiff = 0;
  for (let i = data.length - period; i < data.length; i++) {
     sumSqDiff += Math.pow(data[i] - sma, 2);
  }
  const variance = sumSqDiff / period;
  const stdDev = Math.sqrt(variance);

  return {
    middle: sma,
    upper: sma + (stdDev * multiplier),
    lower: sma - (stdDev * multiplier)
  };
};

export const calculateMACD = (data: number[], fast: number = 12, slow: number = 26, signal: number = 9) => {
  if (data.length < slow + signal) return { macd: 0, signal: 0, histogram: 0 };

  // Optimized generic EMA series generator that doesn't create excessive intermediate arrays
  const calculateEMASeries = (prices: number[], p: number): number[] => {
    const k = 2 / (p + 1);
    const result: number[] = new Array(prices.length);
    let ema = prices[0]; // Simple initialization, ideally should be SMA of first N
    result[0] = ema;
    
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
      result[i] = ema;
    }
    return result;
  };

  const emaFast = calculateEMASeries(data, fast);
  const emaSlow = calculateEMASeries(data, slow);
  
  const macdLine: number[] = new Array(data.length);
  for(let i=0; i<data.length; i++) {
      macdLine[i] = emaFast[i] - emaSlow[i];
  }

  const signalLine = calculateEMASeries(macdLine, signal);

  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram: macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1]
  };
};

export const calculateATR = (candles: Candle[], period: number = 14): number => {
  if (candles.length < period + 1) return 0;

  let trSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  
  return trSum / period;
};

export const analyzeTrend = (price: number, ma7: number, ma25: number, rsi: number): 'bullish' | 'bearish' | 'neutral' => {
  if (ma7 > ma25 && rsi > 50) return 'bullish';
  if (ma7 < ma25 && rsi < 50) return 'bearish';
  return 'neutral';
};

export const processCandles = (candles: Candle[]): IndicatorSet => {
  const closes = candles.map(c => c.close);
  
  const rsi = calculateRSI(closes, 14);
  const ma7 = calculateSMA(closes, 7);
  const ma25 = calculateSMA(closes, 25);
  const bb = calculateBollinger(closes, 25, 2);
  const macd = calculateMACD(closes, 12, 26, 9);
  const atr = calculateATR(candles, 14);
  const trend = analyzeTrend(closes[closes.length - 1], ma7, ma25, rsi);

  return {
    rsi,
    ma7,
    ma25,
    upperBand: bb.upper,
    lowerBand: bb.lower,
    macd: macd.macd,
    macdSignal: macd.signal,
    atr,
    trend
  };
};