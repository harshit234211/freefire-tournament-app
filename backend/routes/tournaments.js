const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Chat = require('../models/Chat');

const Schedule = require('../models/Schedule');

const getTodayIST = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const yyyy = ist.getFullYear();
    const mm = String(ist.getMonth() + 1).padStart(2, '0');
    const dd = String(ist.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// @route   GET api/tournaments
// @desc    Get all tournaments (auto-generates today's matches from schedule on demand)
// @access  Public
router.get('/', async (req, res) => {
    try {
        const tournamentsList = await Tournament.find()
            .populate('host', 'username')
            .sort({ date: 1, time: 1 });
            
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json(tournamentsList);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/tournaments/:id
// @desc    Get tournament by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id)
            .populate('host', 'username')
            .populate('joinedPlayers.user', 'username ffName ffUid');
        if (!tournament) {
            return res.status(404).json({ msg: 'Tournament not found' });
        }
        res.json(tournament);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/tournaments/:id/join
// @desc    Register/Join a tournament match (Wallet balance checks & deduplication)
// @access  Private
router.post('/:id/join', auth, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ msg: 'Tournament not found' });
        }

        if (tournament.status !== 'upcoming') {
            return res.status(400).json({ msg: 'Lobby registration closed: Match has started or resolved.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User profile not found' });
        }

        // Validate gamer profile settings
        if (!user.ffUid || !user.ffName) {
            return res.status(400).json({ msg: 'Please complete your Free Fire IGN and Character UID in Profile first!' });
        }

        // Check if already registered
        const isRegistered = tournament.joinedPlayers.some(p => p.user.toString() === req.user.id);
        if (isRegistered) {
            return res.status(400).json({ msg: 'You are already registered for this tournament' });
        }

        // Block duplicate UID entries
        const isUidRegistered = tournament.joinedPlayers.some(p => p.uid === user.ffUid);
        if (isUidRegistered) {
            return res.status(400).json({ msg: 'This Free Fire Character UID is already registered in this match by another player!' });
        }

        // Auto close registration if match time is reached/passed
        const matchTime = new Date(`${tournament.date}T${tournament.time}`);
        if (new Date() >= matchTime) {
            tournament.status = 'ongoing';
            await tournament.save();
            return res.status(400).json({ msg: 'Registration closed. The match has already started!' });
        }

        // Check capacity slots
        if (tournament.joinedPlayers.length >= tournament.totalSlots) {
            return res.status(400).json({ msg: 'Lobby slots are fully booked!' });
        }

        // Check combined wallet balance (coins + winnings)
        const totalBalance = user.coins + user.winnings;
        if (totalBalance < tournament.entryFee) {
            return res.status(400).json({ msg: `Insufficient funds. Entry fee is ₹${tournament.entryFee}. Your balance is ₹${totalBalance}` });
        }

        // Deduct entry fee: prioritizes deposit coins first, then winnings
        let feeRemaining = tournament.entryFee;
        if (user.coins >= feeRemaining) {
            user.coins -= feeRemaining;
            feeRemaining = 0;
        } else {
            feeRemaining -= user.coins;
            user.coins = 0;
            user.winnings -= feeRemaining;
        }

        // Add player to tournament lobby
        tournament.joinedPlayers.push({
            user: user._id,
            name: user.username,
            uid: user.ffUid,
            kills: 0,
            rank: 0
        });

        // Log transaction statement
        const transaction = new Transaction({
            user: user._id,
            type: 'entryfee',
            amount: tournament.entryFee,
            detail: `Lobby entry: ${tournament.title}`,
            status: 'success'
        });

        user.stats.matches += 1;

        await user.save();
        await tournament.save();
        await transaction.save();

        res.json({ tournament, user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/tournaments/:id/chat
// @desc    Get tournament room chat history
// @access  Private
router.get('/:id/chat', auth, async (req, res) => {
    try {
        const chats = await Chat.find({ roomType: 'tournament', tournament: req.params.id })
            .populate('sender', 'username role')
            .sort({ date: 1 })
            .limit(50);
        res.json(chats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/tournaments/:id/chat
// @desc    Post message in tournament room chat
// @access  Private
router.post('/:id/chat', auth, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ msg: 'Message content cannot be blank' });

    try {
        const user = await User.findById(req.user.id);
        const chatMsg = new Chat({
            roomType: 'tournament',
            tournament: req.params.id,
            sender: user._id,
            senderName: user.username,
            message
        });

        await chatMsg.save();
        res.json(chatMsg);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
