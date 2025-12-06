import { PredictionResult, MultiTimeframeData } from '../types';

export class MarketPredictor {
  
  // Calculate next 15-minute block
  public getNextPeriodEnd(): number {
    const now = new Date();
    const minutes = now.getMinutes();
    const remainder = 15 - (minutes % 15);
    const nextBlock = new Date(now.getTime() + remainder * 60000);
    nextBlock.setSeconds(0);
    nextBlock.setMilliseconds(0);
    return nextBlock.getTime();
  }

  public predict(currentPrice: number, indicators: MultiTimeframeData): PredictionResult {
    const i = indicators;
    let score = 0;

    // 15m Weights (Primary)
    if (i['15m'].macd > i['15m'].macdSignal) score += 20;
    else score -= 10;
    
    if (i['15m'].rsi > 50) score += 10;
    if (i['15m'].rsi > 70) score -= 15; // Overbought
    if (i['15m'].rsi < 30) score += 15; // Oversold bounce

    // 1h Trend alignment
    if (i['1h'].trend === 'bullish') score += 15;
    if (i['1h'].trend === 'bearish') score -= 15;

    // 5m Entry
    if (i['5m'].macd > i['5m'].macdSignal) score += 5;

    // Normalize
    const probability = Math.max(10, Math.min(95, 50 + score));
    
    // Determine Signal
    let direction: PredictionResult['direction'] = 'NEUTRAL';
    if (probability > 75) direction = 'STRONG_BUY';
    else if (probability > 60) direction = 'WEAK_BUY';
    else if (probability < 25) direction = 'STRONG_SELL';
    else if (probability < 40) direction = 'WEAK_SELL';

    // Kelly
    const decimalProb = probability / 100;
    const odds = 0.95; 
    let kelly = ((odds * decimalProb) - (1 - decimalProb)) / odds;
    kelly = Math.max(0, kelly * 0.5); 

    return {
      direction,
      probability,
      kellyStake: Number((kelly * 100).toFixed(1)),
      next15mTarget: currentPrice * (1 + (score * 0.00005)),
      signalStrength: Math.min(10, Math.abs(score) / 6)
    };
  }

  public generateAIAnalysis(indicators: MultiTimeframeData, prediction: PredictionResult): string {
    const i15 = indicators['15m'];
    const i5 = indicators['5m'];
    const i1h = indicators['1h'];
    const timeLeft = (this.getNextPeriodEnd() - Date.now()) / 1000;
    
    const phrases = [];

    // Time
    if (timeLeft < 180) phrases.push("⏰ 临近交割窗口 (3m内)，建议停止开新仓。");
    else phrases.push("⏳ 处于周期中段，信号稳定性尚可。");

    // Trend
    if (i1h.trend === 'bullish') phrases.push("📈 1H 级别多头排列，顺势做多胜率更高。");
    else if (i1h.trend === 'bearish') phrases.push("📉 1H 级别空头排列，注意反弹做空。");

    // Momentum
    if (i15.macd > i15.macdSignal) phrases.push("✅ 15m MACD 金叉放量。");
    else phrases.push("⚠️ 15m MACD 死叉或动能衰竭。");

    if (i5.rsi < 30) phrases.push("⚡ 5m 超卖，短线可能有反抽。");

    // Prediction
    if (prediction.probability > 70) phrases.push(`🎯 强力看涨 (${prediction.probability.toFixed(0)}%)。`);
    else if (prediction.probability < 30) phrases.push(`🎯 强力看跌 (${prediction.probability.toFixed(0)}%)。`);
    else phrases.push("👀 震荡市，建议观望。");

    return phrases.join(" ");
  }
}
