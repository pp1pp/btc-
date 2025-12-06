import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, RefreshCw, Network } from 'lucide-react';
import { MetricCard } from './components/MetricCard';
import { LiveChart } from './components/LiveChart';
import { TechnicalGrid } from './components/TechnicalGrid';
import { PredictionGauge } from './components/PredictionGauge';
import { ArbitragePanel } from './components/ArbitragePanel';
import { MicroStructurePanel } from './components/MicroStructurePanel';
import { RiskPanel } from './components/RiskPanel';
import { AIAnalysisPanel } from './components/AIAnalysisPanel';
import { binanceService } from './services/binance';
import { polymarketService } from './services/polymarket';
import { measureLatency } from './services/network';
import { calculateZScoreProbability, estimateVolatility, calculateImpliedVolatility, calculateEV } from './utils/math';
import { StrategyEngine } from './services/strategyEngine';
import { generateMarketAnalysis } from './services/ai';
import { MultiTimeframeData, SignalAnalysis, Timeframe, ArbitrageState, OrderBook, MicroStructureState } from './types';

const strategyEngine = new StrategyEngine();

const EMPTY_INDICATORS: MultiTimeframeData = {
  '5m': { rsi: 50, ma7: 0, ma25: 0, upperBand: 0, lowerBand: 0, macd: 0, macdSignal: 0, atr: 0, trend: 'neutral' },
  '15m': { rsi: 50, ma7: 0, ma25: 0, upperBand: 0, lowerBand: 0, macd: 0, macdSignal: 0, atr: 0, trend: 'neutral' },
  '1h': { rsi: 50, ma7: 0, ma25: 0, upperBand: 0, lowerBand: 0, macd: 0, macdSignal: 0, atr: 0, trend: 'neutral' },
  '4h': { rsi: 50, ma7: 0, ma25: 0, upperBand: 0, lowerBand: 0, macd: 0, macdSignal: 0, atr: 0, trend: 'neutral' },
};

export default function App() {
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [cvd, setCvd] = useState<number>(0);
  const [cvdDiv, setCvdDiv] = useState<'NONE' | 'BULL_TRAP' | 'BEAR_TRAP'>('NONE');
  const [chartData, setChartData] = useState<{timestamp: number, value: number}[]>([]);
  const [indicators, setIndicators] = useState<MultiTimeframeData>(EMPTY_INDICATORS);
  
  const [analysis, setAnalysis] = useState<SignalAnalysis | null>(null);
  const [arbState, setArbState] = useState<ArbitrageState | null>(null);
  const [depth, setDepth] = useState<OrderBook | null>(null);
  
  const [chartTimeframe, setChartTimeframe] = useState<Timeframe | '1m'>('1m');
  const [timeLeft, setTimeLeft] = useState<string>("00:00");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // AI State
  const [aiText, setAiText] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // --- Polymarket & Arbitrage Logic ---
  const updateArbitrage = useCallback(async (currentBtcPrice: number, atr: number) => {
      const market = await polymarketService.findBestBTCMarket();
      if (!market) return;

      // Extract Strike
      const match = market.question.match(/\$?([\d,]+)/);
      const strike = match ? parseFloat(match[1].replace(/,/g, '')) : currentBtcPrice; // Fallback to current if no strike found
      const expiry = new Date(market.endDate).getTime();
      const timeToExpiryYears = (expiry - Date.now()) / (1000 * 60 * 60 * 24 * 365);
      
      const yesToken = market.tokens.find(t => t.outcome === "Yes") || market.tokens[0];
      const polymarketPrice = yesToken.price;

      const sigma = estimateVolatility(atr, currentBtcPrice);
      const { prob: theoreticalProb, z: zScore } = calculateZScoreProbability(currentBtcPrice, strike, timeToExpiryYears, sigma);
      const iv = calculateImpliedVolatility(polymarketPrice, currentBtcPrice, strike, timeToExpiryYears);
      const ev = calculateEV(theoreticalProb, polymarketPrice);
      
      const latency = await measureLatency('https://clob.polymarket.com/time');
      const coinbasePrice = await binanceService.fetchCoinbasePrice();

      const newArbState: ArbitrageState = {
          binancePrice: currentBtcPrice,
          coinbasePrice,
          oracleSpread: currentBtcPrice - coinbasePrice,
          polymarketPrice,
          polymarketId: market.id,
          polymarketTitle: market.question,
          strikePrice: strike,
          expiryDate: expiry,
          theoreticalProb,
          zScore,
          impliedVolatility: iv,
          ev,
          spread: theoreticalProb - polymarketPrice,
          latency,
      };

      setArbState(newArbState);
      return newArbState;
  }, []);

  const refreshData = useCallback(async (updateChart = false) => {
    try {
      // 1. Fetch Indicators
      const data = await binanceService.refreshIndicators();
      setIndicators(data);
      
      const price = binanceService.getCurrentPrice();
      let currentArb = arbState;

      // 2. Fetch Depth & OBI
      const book = await binanceService.fetchDepth();
      setDepth(book);

      // 3. Update Arbitrage Model
      if (price > 0) {
        const atr = data['15m'].atr;
        currentArb = await updateArbitrage(price, atr) || null;
      }

      // 4. Run Strategy Engine (Fuse Data)
      if (currentArb && book) {
          const microState: MicroStructureState = {
              obi: book.obi,
              cvd: cvd, 
              cvdDivergence: cvdDiv 
          };
          
          const newAnalysis = strategyEngine.analyze(currentArb, microState);
          setAnalysis(newAnalysis);
      }

      // 5. Update Chart
      if (updateChart || ['5m', '15m', '1h', '4h'].includes(chartTimeframe)) {
          const chart = await binanceService.getChartData(chartTimeframe);
          setChartData(chart);
      } else if (chartTimeframe === '1m') {
          const chart = await binanceService.getChartData('1m');
          setChartData(chart);
      }
    } catch (e) {
      console.error("Data refresh failed", e);
    }
  }, [chartTimeframe, updateArbitrage, cvd, cvdDiv, arbState]);

  useEffect(() => {
    const init = async () => {
      binanceService.connectWebSocket(
        (price) => setCurrentPrice(price),
        (newCvd, div) => { setCvd(newCvd); setCvdDiv(div); }
      );
      await refreshData(true);
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        refreshData(true);
    }, 5000); // Faster refresh for Strategy
    return () => clearInterval(interval);
  }, [refreshData]);

  // AI Analysis Trigger (Periodically or on significant changes)
  useEffect(() => {
     if (!arbState || !analysis || isLoading) return;
     
     // Throttle: Increased to 60s to prevent 429 Quota errors on Gemini Pro
     const aiInterval = setInterval(async () => {
         if (isAiLoading) return;
         setIsAiLoading(true);
         const microState = { obi: depth?.obi || 0, cvd, cvdDivergence: cvdDiv };
         const text = await generateMarketAnalysis(arbState, microState, analysis, indicators);
         setAiText(text);
         setIsAiLoading(false);
     }, 60000); // 60s interval

     return () => clearInterval(aiInterval);
  }, [arbState, analysis, depth, cvd, cvdDiv, indicators, isLoading, isAiLoading]);

  // Initial AI call once data is ready
  useEffect(() => {
      if (!isLoading && arbState && analysis && aiText === "") {
          setIsAiLoading(true);
          const microState = { obi: depth?.obi || 0, cvd, cvdDivergence: cvdDiv };
          generateMarketAnalysis(arbState, microState, analysis, indicators).then(text => {
              setAiText(text);
              setIsAiLoading(false);
          });
      }
  }, [isLoading, arbState, analysis]);


  // Chart Refresh on Switch
  useEffect(() => {
    const loadChart = async () => {
        const data = await binanceService.getChartData(chartTimeframe);
        setChartData(data);
    };
    loadChart();
  }, [chartTimeframe]);

  // Timer & Market State
  useEffect(() => {
      if (!arbState) return;
      const tick = () => {
        const diff = arbState.expiryDate - Date.now();
        if (diff > 0) {
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        } else {
            setTimeLeft("00:00");
        }
      };
      const t = setInterval(tick, 1000);
      return () => clearInterval(t);
  }, [arbState]);

  // Chart real-time append
  useEffect(() => {
    if (currentPrice === 0) return;
    if (chartTimeframe === '1m') {
      setChartData(prev => {
        const last = prev[prev.length - 1];
        if (last && Date.now() - last.timestamp < 60000) {
           const newData = [...prev];
           newData[newData.length - 1] = { timestamp: last.timestamp, value: currentPrice };
           return newData;
        } else {
           return [...prev, { timestamp: Date.now(), value: currentPrice }].slice(-100);
        }
      });
    }
  }, [currentPrice, chartTimeframe]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <div className="text-gray-500 font-medium animate-pulse flex flex-col items-center">
            <span>正在建立量化套利环境...</span>
            <span className="text-xs text-gray-400 mt-2">Connecting to Binance L2 & Polymarket CLOB via Proxy</span>
        </div>
      </div>
    );
  }

  const isLastMinute = timeLeft.startsWith("00:");

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 overflow-hidden">
      
      {/* Navbar */}
      <nav className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Activity size={18} />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-slate-900 leading-none">PolySniper <span className="text-slate-400 font-normal">PRO</span></h1>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">System Online</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-colors ${isLastMinute ? 'bg-red-50 border-red-200' : 'bg-slate-100 border-slate-200'}`}>
              <Clock size={14} className={isLastMinute ? "text-red-500" : "text-slate-400"} />
              <div className="flex flex-col leading-none">
                 <span className="text-[9px] text-slate-400 font-bold uppercase mb-0.5">Expiry</span>
                 <span className={`text-sm font-mono font-bold ${isLastMinute ? "text-red-600" : "text-slate-700"}`}>
                   {timeLeft}
                 </span>
              </div>
           </div>
           <button onClick={() => refreshData(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
                <RefreshCw size={18} />
           </button>
        </div>
      </nav>

      {/* Main Grid Layout */}
      <main className="flex-1 overflow-hidden p-4 grid grid-cols-12 grid-rows-[repeat(10,minmax(0,1fr))] gap-4 max-w-[1920px] mx-auto w-full">
        
        {/* TOP LEFT: Price Card */}
        <div className="col-span-12 lg:col-span-3 row-span-2">
           <MetricCard 
             label="Binance Spot (L1)" 
             value={`$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
             subValue="WebSocket Feed"
             trend="neutral"
           />
        </div>
        
        {/* TOP CENTER: Pricing Engine */}
        <div className="col-span-12 lg:col-span-5 row-span-2">
            <ArbitragePanel arb={arbState} />
        </div>

        {/* TOP RIGHT: Risk Engine */}
        <div className="col-span-12 lg:col-span-4 row-span-2">
            <RiskPanel arb={arbState} />
        </div>
        
        {/* MIDDLE LEFT: Microstructure (Rows 3-6) */}
        <div className="col-span-12 lg:col-span-3 row-span-4">
             <MicroStructurePanel depth={depth} cvd={cvd} cvdDivergence={cvdDiv} />
        </div>

        {/* MIDDLE CENTER: Live Chart (Rows 3-6) */}
        <div className="col-span-12 lg:col-span-9 row-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 relative overflow-hidden flex flex-col">
           <div className="flex justify-between items-center mb-2 z-10">
              <div className="flex items-center gap-2">
                 <h3 className="font-bold text-slate-800 text-sm">Price Action</h3>
                 <span className="text-xs text-slate-400 font-mono">| {chartTimeframe}</span>
              </div>
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                 {(['1m', '5m', '15m', '1h'] as const).map(t => (
                   <button 
                     key={t} 
                     onClick={() => setChartTimeframe(t)} 
                     className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${chartTimeframe === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                     {t}
                   </button>
                 ))}
              </div>
           </div>
           <div className="flex-1 w-full min-h-0 z-10">
              {/* Pass strike price for dynamic coloring and reference line */}
              <LiveChart data={chartData} strikePrice={arbState?.strikePrice} />
           </div>
        </div>

        {/* BOTTOM LEFT: Signal Gauge (Rows 7-10) */}
        <div className="col-span-12 lg:col-span-3 row-span-4">
           <PredictionGauge analysis={analysis} />
        </div>

        {/* AI ANALYSIS: New Panel (Rows 7-8) */}
        <div className="col-span-12 lg:col-span-9 row-span-2">
           <AIAnalysisPanel text={aiText} isUpdating={isAiLoading} />
        </div>

        {/* BOTTOM RIGHT: Technical Grid (Rows 9-10) */}
        <div className="col-span-12 lg:col-span-9 row-span-2">
           <TechnicalGrid data={indicators} />
        </div>

      </main>
    </div>
  );
}