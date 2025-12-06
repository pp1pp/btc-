/**
 * Network Service Layer
 * Enforces Proxy usage to simulate VPN environment and bypass CORS/Geo-blocks.
 * Implements High-Availability Proxy Rotation.
 */

const PROXY_GENERATORS = [
    // Primary: CORSProxy.io (Usually faster/lower latency for large JSON)
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    // Secondary: AllOrigins (Good fallback, but adds cache busting overhead)
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&t=${Date.now()}`,
    // Tertiary: Fallback to direct (works for some APIs like Binance in certain regions)
    (url: string) => url
];

export const fetchWithProxy = async (url: string, options?: RequestInit): Promise<Response> => {
    let lastError: any;
    
    // Logic: If it's Polymarket, we MUST use proxy (browser CORS blocks it).
    // If it's Binance, we try Direct first for speed, then Proxy.
    const isStrictProxy = url.includes('polymarket');
    
    // Reorder based on strategy: Try the faster proxy first for Polymarket
    const strategy = isStrictProxy 
        ? [0, 1] // Indices of proxies: CORSProxy -> AllOrigins
        : [2, 0, 1]; // Direct -> CORSProxy -> AllOrigins

    for (const index of strategy) {
        try {
            const generator = PROXY_GENERATORS[index];
            const targetUrl = generator(url);
            
            const response = await fetch(targetUrl, {
                ...options,
                headers: {
                    ...options?.headers,
                    // Remove complex headers that might trigger CORS preflight issues on proxies
                }
            });

            if (!response.ok) {
                // Treat 4xx/5xx as failure to trigger rotation
                throw new Error(`HTTP ${response.status}`);
            }
            
            return response;
        } catch (e) {
            // console.warn(`[Network] Strategy ${index} failed for ${url.slice(0, 30)}...`, e);
            lastError = e;
        }
    }

    throw lastError || new Error('All network gateways failed');
};

export const measureLatency = async (url: string): Promise<number> => {
    const start = performance.now();
    try {
        // Use a simple fetch instead of HEAD, as some proxies block HEAD requests
        // We set a short timeout to fail fast if network is truly dead
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);
        
        await fetchWithProxy(url, { 
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(id);
    } catch (e) {
        return 9999; // Max latency on error
    }
    return performance.now() - start;
};