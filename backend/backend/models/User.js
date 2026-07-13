const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['player', 'host', 'admin'],
        default: 'player'
    },
    ffName: {
        type: String,
        default: ''
    },
    ffUid: {
        type: String,
        default: ''
    },
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    coins: {
        type: Number,
        default: 0 // Deposit Wallet (Entry fees only, non-withdrawable)
    },
    winnings: {
        type: Number,
        default: 0 // Winning Wallet (Withdrawable)
    },
    stats: {
        kills: { type: Number, default: 0 },
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        earned: { type: Number, default: 0 }
    },
    clan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clan',
        default: null
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
