const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    roomType: {
        type: String,
        enum: ['global', 'tournament'],
        default: 'global'
    },
    tournament: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        default: null
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Chat', ChatSchema);
