const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
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
        default: ""
    },
    ffUid: {
        type: String,
        default: ""
    },
    coins: {
        type: Number,
        default: 100 // Give 100 free coins on signup for easy testing!
    },
    winnings: {
        type: Number,
        default: 50 // Give 50 winnings coins for easy testing!
    },
    stats: {
        matches: { type: Number, default: 0 },
        kills: { type: Number, default: 0 },
        earned: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
