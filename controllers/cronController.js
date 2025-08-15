// controllers/cronController.js

import { Signal, EodData, eodDb } from '../config/db.js'; 
import { executeRebalance } from '../services/portfolioService.js';

/**
 * POST /api/cron/trigger-rebalance
 * Endpoint for aws's cron job to trigger the rebalance process.
 */
export const triggerRebalance = async (req, res) => {
    // 1. Authenticate the request
    const authHeader = req.headers['authorization'];
    const secret = authHeader && authHeader.split(' ')[1];

    if (secret !== process.env.CRON_SECRET_KEY) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // 2. Fetch all pending signals
        console.log('[CRON] Fetching pending signals...');
        const pendingSignals = await Signal.find({ status: 'PENDING' });
        if (pendingSignals.length === 0) {
            console.log('[CRON] No pending signals to process.');
            return res.status(200).json({ message: 'No pending signals to process.' });
        }
        console.log(`[CRON] Found ${pendingSignals.length} pending signal documents.`);

        // 3. Correctly initialize simple arrays to hold the tickers
        let buySignalTickers = [];
        let sellSignalTickers = [];
        const processedSignalIds = [];

        // 4. Safely process each signal document
        pendingSignals.forEach(signalDoc => {
            if (signalDoc.tickers && Array.isArray(signalDoc.tickers)) {
                if (signalDoc.type === 'BUY') {
                    buySignalTickers.push(...signalDoc.tickers);
                } else if (signalDoc.type === 'SELL') {
                    sellSignalTickers.push(...signalDoc.tickers);
                }
            } else {
                console.warn(`[CRON] Found signal document with malformed tickers: ${signalDoc._id}`);
            }
            processedSignalIds.push(signalDoc._id);
        });
        
        console.log(`[CRON] Buy signals to process: [${buySignalTickers.join(', ')}]`);
        console.log(`[CRON] Sell signals to process: [${sellSignalTickers.join(', ')}]`);

        // ===================================================================
        // --- FINAL DIAGNOSTIC CHECK ---
        // ===================================================================
        try {
            console.log("\n--- [DIAGNOSTIC] STARTING EOD DATABASE CHECK ---");
            const eodUri = process.env.MONGO_URI_EOD || "NOT SET";
            console.log(`[DIAGNOSTIC] Using MONGO_URI_EOD: ${eodUri.substring(0, 20)}...`);
            
            // Log the actual DB and Collection names the application is using
            const dbName = eodDb.name;
            const collectionName = EodData.collection.name;
            console.log(`[DIAGNOSTIC] App is connected to DB: '${dbName}'`);
            console.log(`[DIAGNOSTIC] App is querying Collection: '${collectionName}'`);

            console.log("[DIAGNOSTIC] Attempting to find ANY document...");
            const anyDoc = await EodData.findOne({});
            if (anyDoc) {
                console.log(`[DIAGNOSTIC] SUCCESS: Found a document. Symbol: ${anyDoc.symbol}.`);
            } else {
                console.error(`[DIAGNOSTIC] FAILURE: Could not find ANY document in '${dbName}.${collectionName}'.`);
            }
            console.log("--- [DIAGNOSTIC] EOD DATABASE CHECK COMPLETE ---\n");
        } catch (diagError) {
            console.error("[DIAGNOSTIC] ERROR during direct EOD database check:", diagError);
        }
        // ===================================================================

        // 5. Execute the rebalance with the simple ticker arrays
        const report = await executeRebalance(buySignalTickers, sellSignalTickers);

        // 6. Mark signals as processed
        console.log('[CRON] Updating signals to PROCESSED status...');
        await Signal.updateMany(
            { _id: { $in: processedSignalIds } },
            { $set: { status: 'PROCESSED', processedAt: new Date() } }
        );
        console.log('[CRON] ...Update complete.');

        res.status(200).json({ message: 'Cron job executed successfully.', report });
    } catch (error) {
        console.error('Error in cron trigger:', error);
        res.status(500).json({ message: 'Cron job failed.', error: error.message });
    }
};