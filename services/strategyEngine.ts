import { ArbitrageState, MicroStructureState, SignalAnalysis } from '../types';
import { calculateKelly } from '../utils/math';

export class StrategyEngine {

  public analyze(
    arb: ArbitrageState | null,
    micro: MicroStructureState | null
  ): SignalAnalysis {
    const analysis: SignalAnalysis = {
      action: 'WAIT',
      confidence: 0,
      kellyStake: 0,
      reason: [],
      layer1_Micro: 'WARN',
      layer2_Pricing: 'WARN',
      layer3_Risk: 'WARN'
    };

    if (!arb || !micro) {
        analysis.reason.push("等待数据同步...");
        return analysis;
    }

    // --- 0. Latency Check (Execution Risk) ---
    // Relaxed threshold for Web Interface (3000ms)
    // We treat this as a WARNING now, not a hard FAIL, to allow viewing the opportunity.
    if (arb.latency > 3000) {
        analysis.reason.push(`⚠️ API 延迟较高 (${arb.latency.toFixed(0)}ms)`);
        analysis.layer3_Risk = 'WARN'; 
    } else {
        analysis.layer3_Risk = 'PASS';
    }

    // --- 1. Pricing Layer (The Core: EV) ---
    // EV = Theoretical Probability (Z-Score) - Market Price
    const ev = arb.ev;
    const evPercent = ev * 100;

    let pricingScore = 0;
    
    // Thresholds: We need at least 5% edge to cover fees/spreads. 15% is a home run.
    if (ev > 0.15) pricingScore = 3; 
    else if (ev > 0.08) pricingScore = 2;
    else if (ev > 0.04) pricingScore = 1;
    else if (ev < -0.04) pricingScore = -1; // Negative EV (Overpriced) -> Signal to Sell YES or Buy NO
    else if (ev < -0.08) pricingScore = -2;
    else if (ev < -0.15) pricingScore = -3;

    if (Math.abs(pricingScore) >= 1) analysis.layer2_Pricing = 'PASS';
    else analysis.layer2_Pricing = 'FAIL'; // Market is efficient, no trade

    // --- 2. Microstructure Layer (Confirmation) ---
    // OBI (Order Book Imbalance) confirms the Spot move.
    // If Z-Score says "Buy YES" (Price should go up), we want OBI > 0 (Buy pressure on Spot).
    let microScore = 0;
    const obi = micro.obi;
    
    if (obi > 0.2) microScore = 1;
    if (obi < -0.2) microScore = -1;
    
    // CVD Divergence is a veto
    if (micro.cvdDivergence === 'BULL_TRAP' && pricingScore > 0) {
        microScore = -5; // Veto bullish trade
        analysis.reason.push("⚠️ CVD 诱多 (Bull Trap)");
    }
    if (micro.cvdDivergence === 'BEAR_TRAP' && pricingScore < 0) {
        microScore = 5; // Veto bearish trade
        analysis.reason.push("⚠️ CVD 诱空 (Bear Trap)");
    }

    if (Math.abs(microScore) < 5) analysis.layer1_Micro = 'PASS';
    else analysis.layer1_Micro = 'WARN';

    // --- 3. Synthesis ---
    // Direction based on PRICING (EV), filtered by Microstructure
    const direction = pricingScore > 0 ? 'BUY' : 'SELL';
    
    // Conflict check
    if (pricingScore > 0 && microScore < 0) {
        analysis.action = 'WAIT';
        analysis.reason.push("⚠️ 模型看涨但现货卖压大");
        return analysis;
    }
    if (pricingScore < 0 && microScore > 0) {
        analysis.action = 'WAIT';
        analysis.reason.push("⚠️ 模型看跌但现货买盘强");
        return analysis;
    }

    // --- 4. Kelly Sizing ---
    // If EV is positive, calculate stake.
    let winProb = arb.theoreticalProb;
    let costBase = arb.polymarketPrice;
    
    // If we are "Selling" (Betting NO), the probability of winning is (1 - Prob_Yes) and cost is (1 - Price_Yes) roughly
    if (direction === 'SELL') {
        winProb = 1 - arb.theoreticalProb;
        costBase = 1 - arb.polymarketPrice;
    }

    const rawKelly = calculateKelly(winProb, costBase);
    // Fractional Kelly (Safety)
    // Reduce stake if latency is high
    const latencyPenalty = arb.latency > 2000 ? 0.5 : 1.0;
    const confidenceMultiplier = Math.abs(pricingScore) >= 2 ? 0.5 : 0.25; 
    
    analysis.kellyStake = Math.min(rawKelly * confidenceMultiplier * latencyPenalty * 100, 20); // Cap at 20%

    // Final Decision
    if (analysis.layer2_Pricing === 'PASS' && analysis.kellyStake > 0) {
        if (Math.abs(pricingScore) >= 2) {
            analysis.action = direction === 'BUY' ? 'STRONG_BUY' : 'STRONG_SELL';
            analysis.confidence = 90;
        } else {
            analysis.action = direction === 'BUY' ? 'WEAK_BUY' : 'WEAK_SELL';
            analysis.confidence = 60;
        }

        // Reasons
        analysis.reason.push(direction === 'BUY' 
            ? `✅ 价格低估 (EV +${evPercent.toFixed(1)}%)`
            : `✅ 价格高估 (EV ${evPercent.toFixed(1)}%)`
        );
        analysis.reason.push(`🎯 理论胜率 ${(winProb*100).toFixed(0)}% vs 赔率 ${(costBase*100).toFixed(0)}¢`);
    } else {
        analysis.action = 'WAIT';
        if (analysis.reason.length === 0) analysis.reason.push("市场定价合理 (无套利空间)");
    }

    return analysis;
  }
}