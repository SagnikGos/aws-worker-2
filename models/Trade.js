import mongoose from 'mongoose';

const TradeSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['BUY', 'SELL'], required: true },
    asset: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    realizedPL: { type: Number, default: null }, 
});

export default TradeSchema;