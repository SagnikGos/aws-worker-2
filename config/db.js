import mongoose from 'mongoose';
import dotenv from 'dotenv';


dotenv.config();

import PortfolioSchema from '../models/Portfolio.js';
import StockSchema from '../models/Stock.js';
import TradeSchema from '../models/Trade.js';
import PortfolioSnapshotSchema from '../models/PortfolioSnapshot.js';
import EodDataSchema from '../models/eodData.js';
import SignalSchema from '../models/Signal.js';


const appDb = mongoose.createConnection(process.env.MONGO_URI_APP);

appDb.on('connected', () => console.log('✅ Connected to Main App MongoDB.'));
appDb.on('error', (err) => console.error('App DB Connection Error:', err));



const eodDb = mongoose.createConnection(process.env.MONGO_URI_EOD);

eodDb.on('connected', () => console.log('📈 Connected to EOD Data MongoDB.'));
eodDb.on('error', (err) => console.error('EOD DB Connection Error:', err));




export const Portfolio = appDb.model('Portfolio', PortfolioSchema);
export const Stock = appDb.model('Stock', StockSchema);
export const Trade = appDb.model('Trade', TradeSchema);
export const PortfolioSnapshot = appDb.model('PortfolioSnapshot', PortfolioSnapshotSchema);
export const Signal = appDb.model('Signal', SignalSchema);

export const EodData = eodDb.model('EodData', EodDataSchema, 'eod_data_1');


export { appDb, eodDb };