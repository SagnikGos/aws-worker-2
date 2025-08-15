import mongoose from 'mongoose';

const PortfolioSnapshotSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    value: { type: Number, required: true },
});

export default PortfolioSnapshotSchema;