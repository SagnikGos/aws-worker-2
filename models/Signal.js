import mongoose from 'mongoose';

const SignalSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['BUY', 'SELL'],
        required: true
    },
    // The list of tickers to buy or sell
    tickers: [{
        type: String,
        required: true
    }],
    status: {
        type: String,
        enum: ['PENDING', 'PROCESSED', 'FAILED'],
        default: 'PENDING'
    },
    processedAt: {
        type: Date
    }
}, { timestamps: true });

export default SignalSchema;