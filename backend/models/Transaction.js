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
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
