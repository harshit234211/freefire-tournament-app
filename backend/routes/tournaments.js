const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Announcement = require('../models/Announcement');

// @route   GET api/tournaments
// @desc    Get all tournaments
// @access  Public
router.get('/', async (req, res) => {
    try {
        const tournaments = await Tournament.find().sort({ createdAt: -1 });
        res.json(tournaments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/tournaments/leaderboard
// @desc    Get top player standings
// @access  Public
router.get('/leaderboard', async (req, res) => {
    try {
        const topPlayers = await User.find({ $or: [{ 'stats.earned': { $gt: 0 } }, { winnings: { $gt: 0 } }] })
            .select('username stats winnings')
            .sort({ 'stats.earned': -1 })
            .limit(20);
            
        const formatted = topPlayers.map((u, idx) => ({
            rank: idx + 1,
            name: u.username,
            kills: u.stats.kills,
            winnings: u.stats.earned
        }));
        
        res.json(formatted);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/tournaments/announcements
// @desc    Get system broadcasts and winner announcements
// @access  Public
router.get('/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(10);
        res.json(announcements);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/tournaments/:id/join
// @desc    Join a tournament match (Auto fee deduction & validation)
// @access  Private
router.post('/:id/join', authenticate, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ msg: 'Tournament not found' });
        }

        if (tournament.status !== 'upcoming') {
            return res.status(400).json({ msg: 'Match is already running or completed' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Validate Game details
        if (!user.ffUid || !user.ffName) {
            return res.status(400).json({ msg: 'Please set your Free Fire IGN and Character UID in Profile first!' });
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
            if (tournament.status === 'upcoming') {
                tournament.status = 'ongoing';
                await tournament.save();
            }
            return res.status(400).json({ msg: 'Registration closed. The match has already started!' });
        }

        // Check capacity
        if (tournament.joinedPlayers.length >= tournament.totalSlots) {
            return res.status(400).json({ msg: 'Tournament slots are full' });
        }

        // Check combined wallet balance (coins + winnings)
        const totalBalance = user.coins + user.winnings;
        if (totalBalance < tournament.entryFee) {
            return res.status(400).json({ msg: `Insufficient funds. Entry fee is ₹${tournament.entryFee}. Your balance is ₹${totalBalance}` });
        }

        // Deduct entry fee
        let feeRemaining = tournament.entryFee;
        if (user.coins >= feeRemaining) {
            user.coins -= feeRemaining;
            feeRemaining = 0;
        } else {
            feeRemaining -= user.coins;
            user.coins = 0;
            user.winnings -= feeRemaining;
        }

        // Add player to match
        tournament.joinedPlayers.push({
            user: user._id,
            name: user.username,
            uid: user.ffUid,
            kills: 0,
            rank: 0
        });

        // Log transaction
        const transaction = new Transaction({
            user: user._id,
            type: 'entryfee',
            amount: tournament.entryFee,
            detail: `Registered for match: ${tournament.title}`,
            status: 'success'
        });

        user.stats.matches += 1;

        await user.save();
        await tournament.save();
        await transaction.save();

        res.json({
            tournament,
            user: {
                id: user.id,
                username: user.username,
                phone: user.phone,
                role: user.role,
                coins: user.coins,
                winnings: user.winnings,
                ffName: user.ffName,
                ffUid: user.ffUid,
                stats: user.stats
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/tournaments/:id/room
// @desc    Get Room Credentials (visible to registered players 15m before start)
// @access  Private
router.get('/:id/room', authenticate, async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) {
            return res.status(404).json({ msg: 'Match not found' });
        }

        // Check if user is registered for the match
        const isRegistered = tournament.joinedPlayers.some(p => p.user.toString() === req.user.id);
        
        // Find if user is admin or assignedHost
        const user = await User.findById(req.user.id);
        const hasHostAccess = user.role === 'admin' || (user.role === 'host' && tournament.assignedHost && tournament.assignedHost.toString() === req.user.id);

        if (!isRegistered && !hasHostAccess) {
            return res.status(403).json({ msg: 'Access denied. You are not registered for this tournament.' });
        }

        // Verify timing (unlocks 15 mins before date/time or if match status is ongoing/live)
        const matchDateTime = new Date(`${tournament.date}T${tournament.time}`);
        const now = new Date();
        const diffMs = matchDateTime - now;
        const diffMins = diffMs / 1000 / 60;

        const isTimeUnlocked = diffMins <= 15; // 15 minutes countdown limit

        if (!isTimeUnlocked && tournament.status === 'upcoming' && !hasHostAccess) {
            return res.json({
                locked: true,
                timeLeftMinutes: Math.max(0, Math.floor(diffMins - 15)),
                msg: 'Room credentials will unlock 15 minutes before the match starts.'
            });
        }

        res.json({
            locked: false,
            roomId: tournament.roomId || 'Not set yet by host',
            roomPassword: tournament.roomPassword || 'Not set yet by host'
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
