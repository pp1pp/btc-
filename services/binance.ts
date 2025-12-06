import { Candle, MultiTimeframeData, OrderBook } from '../types';
import { processCandles } from '../utils/ta';
import { fetchWithProxy } from './network';

const BASE_URL = 'https://api.binance.com/api/v3';

interface CacheEntry {
  data: Candle[];
  timestamp: number;
}

export class BinanceService {
  private ws: WebSocket | null = null;
  private wsCvd: WebSocket | null = null;
  private currentPrice: number = 0;
  private onPriceUpdate: ((price: number) => void) | null = null;
  private onCvdUpdate: ((cvd: number, divergence: 'NONE' | 'BULL_TRAP' | 'BEAR_TRAP') => void) | null = null;
  
  private candleCache: Map<string, CacheEntry> = new Map();
  private CACHE_TTL = 2000;
  private mockHistory: Map<string, Candle[]> = new Map();

  // Microstructure State
  private cumulativeVolumeDelta: number = 0;
  private recentHighPrice: number = -Infinity;
  private recentLowPrice: number = Infinity;
  private recentHighCvd: number = -Infinity;
  private recentLowCvd: number = Infinity;
  private historyBuffer: {price: number, cvd: number, time: number}[] = [];

  constructor() {}

  public connectWebSocket(
      onPrice: (price: number) => void, 
      onCvd?: (cvd: number, div: 'NONE' | 'BULL_TRAP' | 'BEAR_TRAP') => void
  ) {
    this.onPriceUpdate = onPrice;
    if (onCvd) this.onCvdUpdate = onCvd;

    if (this.ws) this.ws.close();
    if (this.wsCvd) this.wsCvd.close();
    
    try {
        this.ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade');
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const price = parseFloat(data.p);
                this.currentPrice = price;
                if (this.onPriceUpdate) this.onPriceUpdate(price);
            } catch (e) { console.error("WS Parse Error", e); }
        };

        this.wsCvd = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
        this.wsCvd.onmessage = (event) => {
             try {
                const data = JSON.parse(event.data);
                const qty = parseFloat(data.q);
                const isBuyerMaker = data.m; // True = Sell Order filled (Price down)
                
                // CVD Logic
                if (isBuyerMaker) this.cumulativeVolumeDelta -= qty;
                else this.cumulativeVolumeDelta += qty;

                // Divergence Logic (Simplified 5-min window)
                const now = Date.now();
                this.historyBuffer.push({ price: this.currentPrice, cvd: this.cumulativeVolumeDelta, time: now });
                // Keep last 5 mins
                this.historyBuffer = this.historyBuffer.filter(x => now - x.time < 300000);

                let divergence: 'NONE' | 'BULL_TRAP' | 'BEAR_TRAP' = 'NONE';
                
                // Detect local high in price
                if (this.currentPrice > this.recentHighPrice) {
                    this.recentHighPrice = this.currentPrice;
                    // If Price makes high but CVD is lower than previous CVD high => Bull Trap (Absorption)
                    if (this.cumulativeVolumeDelta < this.recentHighCvd * 0.98) {
                        divergence = 'BULL_TRAP';
                    }
                    this.recentHighCvd = Math.max(this.recentHighCvd, this.cumulativeVolumeDelta);
                }

                if (this.onCvdUpdate) this.onCvdUpdate(this.cumulativeVolumeDelta, divergence);
            } catch (e) { }
        };
    } catch (e) {
        console.warn("WebSocket init failed", e);
    }
  }

  public async fetchCoinbasePrice(): Promise<number> {
      try {
          // Coinbase Public API
          const response = await fetchWithProxy('https://api.coinbase.com/v2/prices/BTC-USD/spot');
          const data = await response.json();
          return parseFloat(data.data.amount);
      } catch (e) {
          return this.currentPrice * (1 + (Math.random() * 0.0005)); // Fallback simulation
      }
  }

  public async fetchDepth(): Promise<OrderBook> {
      try {
          const response = await fetchWithProxy(`${BASE_URL}/depth?symbol=BTCUSDT&limit=20`);
          const data = await response.json();
          
          const bids = data.bids.map((x: string[]) => ({ price: parseFloat(x[0]), amount: parseFloat(x[1]), total: 0 }));
          const asks = data.asks.map((x: string[]) => ({ price: parseFloat(x[0]), amount: parseFloat(x[1]), total: 0 }));

          // Calculate OBI (Order Book Imbalance)
          // OBI = (BidVol - AskVol) / (BidVol + AskVol)
          let bidVol = 0;
          let askVol = 0;
          bids.forEach((b: any) => bidVol += b.amount);
          asks.forEach((a: any) => askVol += a.amount);
          
          const obi = (bidVol + askVol) === 0 ? 0 : (bidVol - askVol) / (bidVol + askVol);

          return { bids, asks, timestamp: Date.now(), obi };
      } catch (e) {
          return { bids: [], asks: [], timestamp: Date.now(), obi: 0 };
      }
  }

  public async fetchCandles(interval: string): Promise<Candle[]> {
    const cacheKey = interval;
    const now = Date.now();
    const cached = this.candleCache.get(cacheKey);

    if (cached && (now - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }

    try {
      const response = await fetchWithProxy(`${BASE_URL}/klines?symbol=BTCUSDT&interval=${interval}&limit=120`);
      
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      const candles: Candle[] = data.map((d: any) => ({
        time: d[0],
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      }));

      this.candleCache.set(cacheKey, { data: candles, timestamp: now });
      
      if (candles.length > 0 && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
          this.currentPrice = candles[candles.length - 1].close;
      }
      return candles;
    } catch (error) {
      return this.getMockCandles(interval);
    }
  }

  private getMockCandles(interval: string): Candle[] {
     // Kept same as previous version
    const limit = 120;
    const now = Date.now();
    const msMap: {[key:string]: number} = {'1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000};
    const step = msMap[interval] || 60000;
    let history = this.mockHistory.get(interval);
    if (!history) {
        history = [];
        let price = this.currentPrice || 90000;
        for (let i = limit; i > 0; i--) {
            const time = now - i * step;
            const open = price;
            const close = price * (1 + (Math.random() - 0.5) * 0.002);
            history.push({ time, open, high: open*1.001, low: open*0.999, close, volume: Math.random() * 100 });
            price = close;
        }
        this.mockHistory.set(interval, history);
        return history;
    }
    const last = history[history.length-1];
    if (now - last.time > step) {
        const close = last.close * (1 + (Math.random() - 0.5) * 0.005);
        history.push({ time: last.time+step, open: last.close, high: close*1.001, low: close*0.999, close, volume: Math.random()*100 });
        history.shift();
    }
    return history;
  }

  public async refreshIndicators(): Promise<MultiTimeframeData> {
    const [c5m, c15m, c1h, c4h] = await Promise.all([
      this.fetchCandles('5m'),
      this.fetchCandles('15m'),
      this.fetchCandles('1h'),
      this.fetchCandles('4h')
    ]);

    return {
      '5m': processCandles(c5m),
      '15m': processCandles(c15m),
      '1h': processCandles(c1h),
      '4h': processCandles(c4h)
    };
  }

  public async getChartData(interval: string): Promise<{timestamp: number, value: number}[]> {
      const candles = await this.fetchCandles(interval);
      return candles.map(c => ({
          timestamp: c.time,
          value: c.close
      }));
  }

  public getCurrentPrice(): number {
      return this.currentPrice;
  }
}

export const binanceService = new BinanceService();