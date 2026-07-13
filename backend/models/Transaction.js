const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'entryfee', 'winning', 'commission'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'pending_approval', 'success', 'failed'],
        default: 'success'
    },
    detail: {
        type: String,
        default: ""
    },
    cashfreeOrderId: {
        type: String,
        default: ""
    },
    paymentDetails: {
        type: String,
        default: "" // UPI ID or phone number for withdrawals
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
