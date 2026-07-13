const mongoose = require('mongoose');

const ClanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    tag: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 6
    },
    leader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    points: {
        type: Number,
        default: 0
    },
    logo: {
        type: String,
        default: ''
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Clan', ClanSchema);
