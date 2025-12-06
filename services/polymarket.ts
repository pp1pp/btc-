import { fetchWithProxy } from './network';

const GAMMA_API = 'https://gamma-api.polymarket.com/events';
const CLOB_API = 'https://clob.polymarket.com';

interface PolymarketMarket {
    id: string;
    question: string;
    endDate: string;
    tokens: {
        tokenId: string;
        outcome: string;
        price: number;
    }[];
    marketSlug: string;
}

export class PolymarketService {
    
    /**
     * Finds the NEAREST expiring "BTC Price" market.
     * This ensures we are analyzing the specific 15m/Hourly candle that matters.
     */
    public async findBestBTCMarket(): Promise<PolymarketMarket | null> {
        try {
            // Fetch active markets, limit increased to 100 to ensure we capture new low-volume 15m markets
            const url = `${GAMMA_API}?limit=100&active=true&closed=false&order=volume&ascending=false&tag_id=1`; // tag_id 1 is usually Crypto
            
            const response = await fetchWithProxy(url);
            const data = await response.json();
            
            if (!Array.isArray(data)) throw new Error("Invalid API Response format");

            const now = new Date().getTime();

            // Filter for:
            // 1. Bitcoin/BTC in title
            // 2. Binary Price prediction (Above/Below/Resides)
            // 3. Expiry is in the future
            const btcMarkets = data.filter((m: any) => {
                const q = (m.question || "").toLowerCase();
                const endDate = new Date(m.end_date).getTime();
                return (q.includes("bitcoin") || q.includes("btc")) && 
                       (q.includes(">") || q.includes("above") || q.includes("price")) &&
                       endDate > now;
            });
            
            // Sort by nearest expiry to capture the "15m" or "Next Hourly" market
            // This is critical: Volume sort alone might put the monthly market first.
            // We re-sort by Time here.
            btcMarkets.sort((a: any, b: any) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());

            if (btcMarkets.length > 0) {
                const m = btcMarkets[0];
                return {
                    id: m.id,
                    question: m.question,
                    endDate: m.end_date,
                    tokens: m.tokens, // [{token_id, outcome, price, ...}]
                    marketSlug: m.slug
                };
            }
            throw new Error("No live BTC markets found");

        } catch (e) {
            // console.warn("Polymarket Discovery Failed, using Simulation", e);
            return this.getSimulatedMarket();
        }
    }

    /**
     * Get Orderbook (L2 Data) from CLOB API
     */
    public async getOrderBook(tokenId: string) {
        if (!tokenId || tokenId.startsWith("mock-")) return { bids: [], asks: [] };

        try {
            const url = `${CLOB_API}/book?token_id=${tokenId}`;
            const response = await fetchWithProxy(url);
            const data = await response.json();
            return data; // { bids: [{price, size}], asks: [{price, size}] }
        } catch (e) {
            console.error("CLOB Fetch Failed", e);
            return { bids: [], asks: [] };
        }
    }

    private getSimulatedMarket(): PolymarketMarket {
         // Create a simulated 15m expiry market for demo/fallback
         const now = new Date();
         // Round up to next 15 min slot
         const remainder = 15 - (now.getMinutes() % 15);
         const expiry = new Date(now.getTime() + remainder * 60000);

         return {
            id: "sim-btc-15m",
            question: "Bitcoin > Current Strike (Simulated)",
            endDate: expiry.toISOString(),
            tokens: [
                { tokenId: "mock-yes", outcome: "Yes", price: 0.48 + (Math.random() * 0.04) }, // Random fluctuates around 0.50
                { tokenId: "mock-no", outcome: "No", price: 0.52 - (Math.random() * 0.04) }
            ],
            marketSlug: "btc-simulated"
        };
    }
}

export const polymarketService = new PolymarketService();