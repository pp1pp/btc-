export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h';

export interface IndicatorSet {
  rsi: number;
  ma7: number;
  ma25: number;
  upperBand: number;
  lowerBand: number;
  macd: number;
  macdSignal: number;
  atr: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface MultiTimeframeData {
  '5m': IndicatorSet;
  '15m': IndicatorSet;
  '1h': IndicatorSet;
  '4h': IndicatorSet;
}

export interface OrderBookItem {
  price: number;
  amount: number;
  total: number; 
}

export interface OrderBook {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
  timestamp: number;
  obi: number; // Order Book Imbalance (-1 to 1)
}

export interface MicroStructureState {
  obi: number;
  cvd: number;
  cvdDivergence: 'NONE' | 'BULL_TRAP' | 'BEAR_TRAP';
}

export interface ArbitrageState {
  binancePrice: number;
  coinbasePrice: number; 
  oracleSpread: number;
  
  polymarketPrice: number; 
  polymarketId: string;
  polymarketTitle: string;
  strikePrice: number;
  expiryDate: number;
  
  theoreticalProb: number; // Based on Z-Score
  zScore: number;
  impliedVolatility: number; 
  ev: number; // Expected Value per $1
  spread: number; 
  latency: number; 
}

export interface SignalAnalysis {
  action: 'STRONG_BUY' | 'WEAK_BUY' | 'WAIT' | 'WEAK_SELL' | 'STRONG_SELL';
  confidence: number; // 0-100
  kellyStake: number; // % of bankroll
  reason: string[];
  
  // Layer Checks
  layer1_Micro: 'PASS' | 'WARN' | 'FAIL';
  layer2_Pricing: 'PASS' | 'WARN' | 'FAIL';
  layer3_Risk: 'PASS' | 'WARN' | 'FAIL';
}

export interface PredictionResult {
  direction: 'STRONG_BUY' | 'WEAK_BUY' | 'WAIT' | 'WEAK_SELL' | 'STRONG_SELL' | 'NEUTRAL';
  probability: number;
  kellyStake: number;
  next15mTarget: number;
  signalStrength: number;
}

export interface MarketState {
  timestamp: number;
  currentPrice: number;
  periodEnd: number; 
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}