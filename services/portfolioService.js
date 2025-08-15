import { Portfolio, Stock, Trade, PortfolioSnapshot } from '../config/db.js';
import { getLatestPricesFromDB } from '../utils/priceHelper.js';

const getOrCreatePortfolio = async () => {
    let portfolio = await Portfolio.findOne().populate('stocks');
    if (!portfolio) {
        portfolio = new Portfolio();
        await portfolio.save();
    }
    return portfolio;
};

/**
 * Configuration for the dynamic stop-loss tiers.
 * The tiers should be sorted in descending order of profit thresholds.
 */
const STOP_LOSS_TIERS = [
    { profitThreshold: 25, lockInTarget: 0.25 },
    { profitThreshold: 20, lockInTarget: 0.20 },
    { profitThreshold: 15, lockInTarget: 0.12 },
    { profitThreshold: 10, lockInTarget: 0.08 },
    { profitThreshold: 5,  lockInTarget: 0.05 }
];

/**
 * Calculates the dynamic stop-loss price based on profit percentage.
 * @param {number} purchasePrice - The initial purchase price of the stock.
 * @param {number} currentPrice - The current market price of the stock.
 * @returns {number} The calculated stop-loss price.
 */
const getDynamicStopLossPrice = (purchasePrice, currentPrice) => {
    const profitPercent = ((currentPrice - purchasePrice) / purchasePrice) * 100;
    let stopLossProfitTarget = 0.00; // Default to breakeven for profits < 5%

    // Special trailing logic for high profits (over 30%)
    if (profitPercent >= 30) {
        // Set the target 10 percentage points below the current profit
        stopLossProfitTarget = (profitPercent - 10) / 100;
    } else {
        // Find the appropriate tier from the configuration for profits between 5% and 30%
        for (const tier of STOP_LOSS_TIERS) {
            if (profitPercent >= tier.profitThreshold) {
                stopLossProfitTarget = tier.lockInTarget;
                break; // Exit loop once the highest applicable tier is found
            }
        }
    }

    // Calculate the final stop-loss price
    return purchasePrice * (1 + stopLossProfitTarget);
};


export const executeRebalance = async (buySignalTickers = [], sellSignalTickers = []) => {
    const report = { soldByStopLoss: [], soldBySignal: [], bought: [], errors: [] };
    const portfolio = await getOrCreatePortfolio();
    
    const allRelevantTickers = [
        ...portfolio.stocks.map(s => s.ticker),
        ...buySignalTickers,
        ...sellSignalTickers
    ];
    const uniqueTickers = [...new Set(allRelevantTickers)];

    // 1. Fetch current market prices for all relevant stocks first
    const priceMap = await getLatestPricesFromDB(uniqueTickers);

    const stocksToSell = new Map(); 

    // 2. Dynamic Stop-Loss Check
    for (const stock of portfolio.stocks) {
        const currentPrice = priceMap.get(stock.ticker)?.lpt;
        if (!currentPrice) continue; // Skip if price data is unavailable

        const dynamicStopLoss = getDynamicStopLossPrice(stock.purchasePrice, currentPrice);

        if (currentPrice < dynamicStopLoss) {
            stocksToSell.set(stock.ticker, { reason: 'STOP-LOSS', stock, price: currentPrice });
        }
    }

    // 3. Process Sell Signals from Admin
    for (const ticker of sellSignalTickers) {
        if (stocksToSell.has(ticker)) continue; // Already marked for sale by stop-loss
        const stock = portfolio.stocks.find(s => s.ticker === ticker);
        const currentPrice = priceMap.get(ticker)?.lpt;

        if (stock && currentPrice) {
            stocksToSell.set(ticker, { reason: 'SIGNAL', stock, price: currentPrice });
        }
    }

    // 4. Execute all sales
    for (const [ticker, sellOrder] of stocksToSell.entries()) {
        const { stock, price, reason } = sellOrder;
        const saleValue = stock.quantity * price;
        const purchaseValue = stock.quantity * stock.purchasePrice;
        const tradePL = saleValue - purchaseValue;

        portfolio.realizedPL += tradePL;
        portfolio.totalInvestment -= purchaseValue;
        portfolio.totalTrades += 1;
        if (tradePL > 0) portfolio.winningTrades += 1;
        
        await new Trade({ type: 'SELL', asset: ticker, quantity: stock.quantity, price, realizedPL: tradePL }).save();
        await Stock.findByIdAndDelete(stock._id);
        
        if (reason === 'STOP-LOSS') report.soldByStopLoss.push(ticker);
        else report.soldBySignal.push(ticker);
    }
    
    // 5. Execute all buys
    const currentHoldings = portfolio.stocks.map(s => s.ticker);
    for (const ticker of buySignalTickers) {
        const isAlreadyHeld = currentHoldings.includes(ticker);
        if (isAlreadyHeld) continue; // Do not buy if already holding

        const currentPrice = priceMap.get(ticker)?.lpt;
        if (!currentPrice) {
            report.errors.push({ ticker, message: "Could not fetch price for buy order." });
            continue;
        }

        const quantity = Math.floor(100000 / currentPrice); // Invest approx. ₹1 Lakh
        if (quantity > 0) {
            const newStock = new Stock({
                ticker,
                name: ticker, // Name can be updated later by a separate metadata job
                purchasePrice: currentPrice,
                quantity,
            });
            await newStock.save();
            await new Trade({ type: 'BUY', asset: ticker, quantity, price: currentPrice }).save();
            
            portfolio.totalInvestment += (quantity * currentPrice);
            report.bought.push(ticker);
        }
    }

    // 6. Final portfolio recalculation & snapshot
    await portfolio.save(); // Save changes before recalculating values
    const finalPortfolio = await getOrCreatePortfolio(); // Re-fetch to get fresh state
    let finalValue = 0;
    const finalPriceMap = await getLatestPricesFromDB(finalPortfolio.stocks.map(s => s.ticker));
    for (const stock of finalPortfolio.stocks) {
        finalValue += (finalPriceMap.get(stock.ticker)?.lpt || stock.purchasePrice) * stock.quantity;
    }
    finalPortfolio.currentValue = finalValue;
    finalPortfolio.lastRebalanced = new Date();
    await finalPortfolio.save();
    await new PortfolioSnapshot({ date: new Date(), value: finalValue }).save();

    console.log('Rebalancing complete.', report);
    return report;
};