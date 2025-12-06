/**
 * Financial Mathematics Engine
 * Black-Scholes & Quantitative Arbitrage Models
 */

// Cumulative Normal Distribution Function
function N(x: number): number {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = (x < 0) ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
}

/**
 * Calculates theoretical probability using Log-Normal Z-Score distribution.
 * Formula: Z = (ln(P/K) + (r - sigma^2/2)t) / (sigma * sqrt(t))
 * Probability = N(Z) (for Call/Yes)
 */
export const calculateZScoreProbability = (
    S: number, // Spot Price
    K: number, // Strike Price
    T: number, // Time to expiry (years)
    sigma: number, // Volatility
    r: number = 0.04 // Risk-free rate
): { prob: number, z: number } => {
    if (T <= 0.000001) return S > K ? { prob: 1, z: 99 } : { prob: 0, z: -99 };
    
    // Standard deviation of log returns over time T
    const volatilityTerm = sigma * Math.sqrt(T);
    
    // Drift term
    const drift = (r - 0.5 * Math.pow(sigma, 2)) * T;
    
    const d2 = (Math.log(S / K) + drift) / volatilityTerm;
    
    return {
        prob: N(d2),
        z: d2
    };
};

export const estimateVolatility = (atr: number, price: number): number => {
    if (price === 0) return 0.5; 
    const periodVol = atr / price;
    // Annualize based on 15m periods (35040 periods/year)
    return periodVol * Math.sqrt(35040); 
};

export const calculateImpliedVolatility = (
    marketProb: number,
    S: number,
    K: number,
    T: number,
    r: number = 0.04
): number => {
    let sigma = 0.5; 
    for (let i = 0; i < 8; i++) {
        const { prob } = calculateZScoreProbability(S, K, T, sigma, r);
        const diff = prob - marketProb;
        if (Math.abs(diff) < 0.001) break;
        
        // Simple adjustment step, Vega derivative is expensive to compute repeatedly
        sigma = sigma - (diff * 2); 
        if (sigma <= 0.01) sigma = 0.01;
    }
    return Math.max(0.01, Math.min(5.0, sigma)); 
};

/**
 * Calculates Expected Value (EV)
 * EV = (Prob_True * 1.00) - Cost
 */
export const calculateEV = (
    theoreticalProb: number,
    marketPrice: number
): number => {
    return theoreticalProb - marketPrice;
};

/**
 * Kelly Criterion for Position Sizing
 * f* = (bp - q) / b
 * where b = odds received - 1
 * p = probability of winning
 * q = probability of losing (1-p)
 */
export const calculateKelly = (prob: number, marketPrice: number): number => {
    if (marketPrice >= 1 || marketPrice <= 0) return 0;
    
    const payout = 1 / marketPrice; // If price is 0.6, payout is 1.66x
    const b = payout - 1; // Net odds
    const p = prob;
    const q = 1 - p;
    
    let f = (b * p - q) / b;
    return Math.max(0, f); // Cannot bet negative
};
