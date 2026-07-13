const mongoose = require('mongoose');

const TournamentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    map: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        required: true
    },
    prizePool: {
        type: Number,
        required: true
    },
    perKill: {
        type: Number,
        required: true
    },
    entryFee: {
        type: Number,
        required: true
    },
    totalSlots: {
        type: Number,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed'],
        default: 'upcoming'
    },
    assignedHost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    joinedPlayers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        name: {
            type: String,
            required: true
        },
        uid: {
            type: String,
            required: true
        },
        kills: {
            type: Number,
            default: 0
        },
        rank: {
            type: Number,
            default: 0
        }
    }],
    roomId: {
        type: String,
        default: ""
    },
    roomPassword: {
        type: String,
        default: ""
    },
    skills: {
        type: Boolean,
        default: false
    },
    attributes: {
        type: Boolean,
        default: false
    },
    bodyShot: {
        type: Boolean,
        default: true
    },
    weapons: {
        type: String,
        default: "All"
    },
    unlimitedAmmo: {
        type: Boolean,
        default: false
    },
    roomType: {
        type: String,
        default: "Normal"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Tournament', TournamentSchema);
