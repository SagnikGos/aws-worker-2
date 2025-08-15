import mongoose from 'mongoose';

const StockSchema = new mongoose.Schema({
    ticker: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true },
    sector: { type: String, default: 'Unclassified' },
    purchasePrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    purchaseDate: { type: Date, default: Date.now }
});

export default StockSchema;