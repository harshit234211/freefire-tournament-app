const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'winning', 'entryfee', 'commission'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    cashfreeOrderId: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null/undefined values for non-deposit types
    },
    detail: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    upiId: {
        type: String,
        default: '' // For withdrawal processing
    },
    utr: {
        type: String,
        default: '' // For manual deposit tracking
    },
    txId: {
        type: String,
        unique: true,
        sparse: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

TransactionSchema.pre('save', async function(next) {
    if (!this.txId) {
        const prefix = this.type === 'withdrawal' ? 'W' : (this.type === 'deposit' ? 'D' : 'TX');
        this.txId = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    }
    next();
});

module.exports = mongoose.model('Transaction', TransactionSchema);
