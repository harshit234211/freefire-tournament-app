const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
    type: {
        type: String, // 'map' or 'mode'
        required: true,
        enum: ['map', 'mode']
    },
    name: {
        type: String, // e.g. "Bermuda", "Lone Wolf 1v1"
        required: true,
        unique: true
    },
    thumbnailUrl: {
        type: String, // Cloud URL or base64
        required: true
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Asset', AssetSchema);
