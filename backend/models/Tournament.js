const mongoose = require('mongoose');

const TournamentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    game: { type: String, default: 'Free Fire MAX' },
    category: { type: String, required: true }, // BR Survival, Clash Squad, Lone Wolf, etc.
    matchId: { type: String, unique: true }, // e.g. #146331
    bannerImage: { type: String, default: '' }, // URL to banner image
    date: { type: String, required: true },
    time: { type: String, required: true },
    entryFee: { type: Number, required: true },
    prizePool: { type: Number, required: true },
    perKill: { type: Number, default: 0 },
    totalSlots: { type: Number, required: true },
    teamType: { type: String, default: 'Solo' }, // Solo, Duo, Squad
    mode: { type: String, default: 'Solo' },     // Solo, 1v1, 2v2, 4v4
    map: { type: String, default: 'Bermuda' },   // Bermuda, Kalahari, Purgatory
    matchType: { type: String, default: 'Paid' }, // Paid, Free
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed'],
        default: 'upcoming'
    },
    roomId: { type: String, default: '' },
    roomPass: { type: String, default: '' },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedPlayers: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        uid: String,
        teamNo: { type: Number, default: 0 },
        position: { type: String, default: 'A' },
        kills: { type: Number, default: 0 },
        rank: { type: Number, default: 0 },
        prize: { type: Number, default: 0 }
    }],
    prizeDistribution: [{
        rank: Number,
        prize: Number
    }],
    rules: [{ type: String }],
    notice: { type: String, default: '' },
    settings: {
        skills: { type: Boolean, default: true },
        attributes: { type: Boolean, default: true },
        bodyShot: { type: String, default: 'Allowed' },
        weapons: { type: String, default: 'All' },
        ammo: { type: String, default: 'Normal' },
        roomType: { type: String, default: 'Normal' }
    },
    dateCreated: { type: Date, default: Date.now }
});

// Auto-generate matchId before saving
TournamentSchema.pre('save', async function(next) {
    if (!this.matchId) {
        this.matchId = '#' + Math.floor(100000 + Math.random() * 900000);
    }
    next();
});

module.exports = mongoose.model('Tournament', TournamentSchema);
