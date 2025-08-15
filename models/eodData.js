import mongoose from 'mongoose';

const EodRecordSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    adjClose: Number,
    volume: Number,
}, { _id: false });

const EodDataSchema = new mongoose.Schema({
    symbol: { type: String, required: true, unique: true, index: true },
    name: String, 
    exchange: String, 
    eods: [EodRecordSchema]
});

export default EodDataSchema;