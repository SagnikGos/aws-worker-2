import { EodData } from '../config/db.js';

export const getLatestPricesFromDB = async (tickers) => {
    const priceData = await EodData.find(
        { symbol: { $in: tickers } },
        { symbol: 1, 'eods': { $slice: 2 } }
    );
    
    const priceMap = new Map();

    for (const stock of priceData) {
        if (stock.eods && stock.eods.length > 0) {
            const latestEod = stock.eods[0];
            const previousEod = stock.eods.length > 1 ? stock.eods[1] : null;

            const dayChangePct = previousEod && previousEod.close
                ? ((latestEod.close - previousEod.close) / previousEod.close) * 100
                : 0;

            priceMap.set(stock.symbol, {
                lpt: latestEod.close,
                dayChangePct: dayChangePct,
            });
        }
    }
    return priceMap;
};