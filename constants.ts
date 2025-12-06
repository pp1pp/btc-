export const APP_CONFIG = {
  REFRESH_RATE_MS: 1000, // 1秒刷新一次，保持实时感但不过快
  SIMULATION_TICK_MS: 1000, 
  
  // 阈值设置
  RSI_OVERBOUGHT: 70,
  RSI_OVERSOLD: 30,
  
  // 显示设置
  GRAPH_POINTS: 100,
};

export const INITIAL_STATE = {
  price: 91240.50,
  volatility: 35, // Low to Medium
};