const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
    time: {
        type: String, // e.g. "09:00 AM", "10:30 PM"
        required: true
    },
    category: {
        type: String, // e.g. "BR Survival", "Clash Squad 4v4"
        required: true
    },
    title: {
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
        default: 20
    },
    teamType: {
        type: String,
        default: 'Solo'
    },
    mode: {
        type: String,
        default: 'Solo'
    },
    map: {
        type: String,
        default: 'Bermuda'
    },
    matchType: {
        type: String,
        default: 'Paid'
    },
    rules: [{
        type: String
    }],
    prizeDistribution: [{
        rank: Number,
        prize: Number
    }],
    notice: {
        type: String,
        default: ''
    },
    enabled: {
        type: Boolean,
        default: true
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Schedule', ScheduleSchema);
