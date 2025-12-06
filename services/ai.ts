import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateMarketAnalysis(
    arb: any, 
    micro: any, 
    signal: any, 
    indicators: any
): Promise<string> {
    const prompt = `
    Act as a senior quantitative trader. Analyze this Bitcoin arbitrage opportunity:
    
    Strategy: Statistical Arbitrage (Binance Spot vs Polymarket Binary Option)
    Current Time: ${new Date().toLocaleTimeString()}
    
    State:
    - Signal: ${signal?.action} (Confidence: ${signal?.confidence}%)
    - Pricing: Spot $${arb?.binancePrice}, Strike $${arb?.strikePrice}, Expiry: ${new Date(arb?.expiryDate).toLocaleTimeString()}
    - Edge: EV ${(arb?.ev * 100).toFixed(2)}%, WinProb ${(arb?.theoreticalProb * 100).toFixed(1)}%, Odds ${(arb?.polymarketPrice * 100).toFixed(1)}%
    - Microstructure: OBI ${micro?.obi.toFixed(2)}, CVD ${micro?.cvd.toFixed(2)}, Divergence ${micro?.cvdDivergence}
    - Technicals (15m): RSI ${indicators?.['15m']?.rsi.toFixed(1)}, Trend ${indicators?.['15m']?.trend}
    
    Provide a tactical assessment using your deep reasoning capabilities.
    
    1. **Context & Validation**: Briefly validate the EV edge against microstructure (OBI/CVD).
    2. **Risk Analysis**: Assess time decay (Theta) vs volatility (Vega) risk relative to expiry.
    3. **Actionable Trade Setup (Mandatory)**:
       - **Direction**: BUY YES / BUY NO / WAIT
       - **Optimal Entry Zone**: Specific price range (in cents) to place limit orders.
       - **Take Profit Target**: Fair value target (in cents).
       - **Stop Loss**: Invalidation price level (in cents).
    4. **Verdict**: Final concise summary.
    
    Keep it concise, dense, and professional. 
    `;

    try {
        // Primary Attempt: Gemini 3 Pro with Thinking
        // This model uses significant quota, so it may hit 429 limits.
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 }
            }
        });
        return response.text || "Analysis unavailable.";
    } catch (e: any) {
        // 429 Resource Exhausted or other errors
        console.warn("Primary AI Model limit reached, falling back to Flash.", e.message);
        try {
            // Fallback: Gemini 2.5 Flash (Faster, lower quota usage)
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            return (response.text || "") + "\n\n[System Note: Analysis provided by backup model due to high traffic]";
        } catch (fallbackError) {
            console.error("AI Analysis Failed", fallbackError);
            return "System Warning: AI Analysis currently unavailable due to API rate limits. Please try again in a few minutes.";
        }
    }
}