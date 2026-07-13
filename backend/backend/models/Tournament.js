const mongoose = require('mongoose');

const TournamentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    game: {
        type: String,
        default: 'Free Fire MAX'
    },
    category: {
        type: String,
        required: true // Lone Wolf, Clash Squad, Battle Royale, etc.
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    entryFee: {
        type: Number,
        required: true
    },
    prizePool: {
        type: Number,
        required: true
    },
    perKill: {
        type: Number,
        default: 0
    },
    totalSlots: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed'],
        default: 'upcoming'
    },
    roomId: {
        type: String,
        default: ''
    },
    roomPass: {
        type: String,
        default: ''
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    joinedPlayers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        name: String,
        uid: String,
        kills: { type: Number, default: 0 },
        rank: { type: Number, default: 0 }
    }],
    settings: {
        skills: { type: Boolean, default: true },
        attributes: { type: Boolean, default: true },
        bodyShot: { type: String, default: 'Allowed' }, // 'Allowed' or 'Headshot Only'
        weapons: { type: String, default: 'All' }, // 'All', 'Sniper Only', etc.
        ammo: { type: String, default: 'Normal' }, // 'Normal', 'Unlimited'
        roomType: { type: String, default: 'Normal' } // 'Normal', 'Tournament'
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Tournament', TournamentSchema);
