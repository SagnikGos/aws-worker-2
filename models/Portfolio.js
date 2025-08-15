import mongoose from 'mongoose';

const PortfolioSchema = new mongoose.Schema({
    name: { type: String, default: 'ML Model Portfolio' },
    totalInvestment: { type: Number, default: 0 }, 
    currentValue: { type: Number, default: 0 }, 
    realizedPL: { type: Number, default: 0 }, 
    lastRebalanced: { type: Date, default: Date.now },
    stocks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stock' }],
    
    // --- New fields for statistics ---
    totalTrades: { type: Number, default: 0 },
    winningTrades: { type: Number, default: 0 },
});

export default PortfolioSchema;