const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Clan = require('../models/Clan');
const User = require('../models/User');
const Chat = require('../models/Chat');

// @route   POST api/clans/create
// @desc    Create a new clan
// @access  Private
router.post('/create', auth, async (req, res) => {
    const { name, tag } = req.body;

    if (!name || !tag) {
        return res.status(400).json({ msg: 'Clan name and tag are required' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (user.clan) {
            return res.status(400).json({ msg: 'You are already a member of a clan. Leave it first!' });
        }

        let clan = await Clan.findOne({ $or: [{ name }, { tag }] });
        if (clan) {
            return res.status(400).json({ msg: 'Clan name or tag is already taken' });
        }

        clan = new Clan({
            name,
            tag: tag.toUpperCase(),
            leader: user._id,
            members: [user._id]
        });

        await clan.save();

        user.clan = clan._id;
        await user.save();

        res.json({ success: true, clan });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/clans/join
// @desc    Join an existing clan
// @access  Private
router.post('/join', auth, async (req, res) => {
    const { clanId } = req.body;

    if (!clanId) {
        return res.status(400).json({ msg: 'Clan ID is required' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (user.clan) {
            return res.status(400).json({ msg: 'You are already a member of a clan' });
        }

        const clan = await Clan.findById(clanId);
        if (!clan) {
            return res.status(404).json({ msg: 'Clan not found' });
        }

        clan.members.push(user._id);
        await clan.save();

        user.clan = clan._id;
        await user.save();

        res.json({ success: true, clan });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/clans/ranking
// @desc    Get clan ranking leaderboard
// @access  Public
router.get('/ranking', async (req, res) => {
    try {
        const clans = await Clan.find()
            .populate('leader', 'username')
            .sort({ points: -1 });
        res.json(clans);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/clans/:id/chat
// @desc    Get clan chat messages
// @access  Private
router.get('/:id/chat', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.clan || user.clan.toString() !== req.params.id) {
            return res.status(401).json({ msg: 'Unauthorized: You do not belong to this clan' });
        }

        const chats = await Chat.find({ roomType: 'global', message: { $regex: `^\\[CLAN:${req.params.id}\\]` } })
            .populate('sender', 'username role')
            .sort({ date: 1 })
            .limit(50);
        
        // Strip the clan wrapper token for display
        const cleanChats = chats.map(c => ({
            _id: c._id,
            sender: c.sender,
            senderName: c.senderName,
            message: c.message.replace(`[CLAN:${req.params.id}] `, ''),
            date: c.date
        }));

        res.json(cleanChats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/clans/:id/chat
// @desc    Send a clan chat message
// @access  Private
router.post('/:id/chat', auth, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ msg: 'Message content cannot be blank' });

    try {
        const user = await User.findById(req.user.id);
        if (!user.clan || user.clan.toString() !== req.params.id) {
            return res.status(401).json({ msg: 'Unauthorized: You do not belong to this clan' });
        }

        const chatMsg = new Chat({
            roomType: 'global',
            sender: user._id,
            senderName: user.username,
            message: `[CLAN:${req.params.id}] ${message}`
        });

        await chatMsg.save();
        res.json(chatMsg);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
