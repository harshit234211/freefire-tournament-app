const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { sendTelegramAlert } = require('../utils/telegram');

// Middleware to verify Host or Admin role
const verifyHost = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'host' && user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Host credentials required' });
        }
        next();
    } catch (err) {
        res.status(500).send('Server security error');
    }
};

// @route   GET api/host/matches
// @desc    Get tournaments assigned to the host
// @access  Private (Host/Admin only)
router.get('/matches', auth, verifyHost, async (req, res) => {
    try {
        const matches = await Tournament.find({ host: req.user.id })
            .populate('joinedPlayers.user', 'username ffUid')
            .sort({ dateCreated: -1 });
        res.json(matches);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/host/match/:id/room
// @desc    Release/Save Room ID and Password
// @access  Private (Host/Admin only)
router.post('/match/:id/room', auth, verifyHost, async (req, res) => {
    const { roomId, roomPass } = req.body;

    if (!roomId || !roomPass) {
        return res.status(400).json({ msg: 'Room ID and Password are required' });
    }

    try {
        const match = await Tournament.findById(req.params.id);
        if (!match) return res.status(404).json({ msg: 'Match not found' });

        match.roomId = roomId;
        match.roomPass = roomPass;
        await match.save();

        res.json({ success: true, msg: 'Room credentials published successfully', match });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/host/match/:id/resolve
// @desc    Resolve match and disburse winnings/commissions
// @access  Private (Host/Admin only)
router.post('/match/:id/resolve', auth, verifyHost, async (req, res) => {
    const { playerResults } = req.body; // Array: [{ uid, kills, rank }]

    if (!playerResults || !Array.isArray(playerResults)) {
        return res.status(400).json({ msg: 'Invalid player results payload' });
    }

    try {
        const match = await Tournament.findById(req.params.id);
        if (!match) return res.status(404).json({ msg: 'Match not found' });

        if (match.status === 'completed') {
            return res.status(400).json({ msg: 'Match has already been resolved' });
        }

        // Find Rank 1 winners to distribute/split the Winner Prize (prizePool)
        const rank1Winners = playerResults.filter(p => parseInt(p.rank) === 1);
        const prizePerWinner = rank1Winners.length > 0 ? (match.prizePool / rank1Winners.length) : 0;
        let booyahWinner = 'Multiple/N/A';

        // Loop and resolve player standings
        for (const playerStats of playerResults) {
            const { uid, kills, rank } = playerStats;
            const rankNum = parseInt(rank) || 99;
            const killNum = parseInt(kills) || 0;

            // Find in tournament registry
            const participantIndex = match.joinedPlayers.findIndex(p => p.uid === uid);
            if (participantIndex !== -1) {
                match.joinedPlayers[participantIndex].kills = killNum;
                match.joinedPlayers[participantIndex].rank = rankNum;
            }

            // Calculate winnings: split of prize pool if Rank 1 + kill rewards
            let rankPrize = 0;
            if (rankNum === 1) {
                rankPrize = prizePerWinner;
                booyahWinner = match.joinedPlayers[participantIndex]?.name || uid;
            }

            const winnings = (killNum * match.perKill) + rankPrize;

            // Update user balance in MongoDB
            const user = await User.findOne({ ffUid: uid });
            if (user && winnings > 0) {
                user.winnings += winnings;
                user.stats.kills += killNum;
                user.stats.earned += winnings;
                if (rankNum === 1) user.stats.wins += 1;
                await user.save();

                // Save winning transaction log
                const transaction = new Transaction({
                    user: user._id,
                    type: 'winning',
                    amount: winnings,
                    detail: `Winnings: ${match.title} (Rank: ${rankNum}, Kills: ${killNum})`,
                    status: 'success'
                });
                await transaction.save();
            }
        }

        // Calculate and disburse Admin Commission
        const totalPlayers = match.joinedPlayers.length;
        const totalCollection = match.entryFee * totalPlayers;
        const adminCommission = totalCollection - match.prizePool;

        if (adminCommission > 0) {
            const adminUser = await User.findOne({ role: 'admin' });
            if (adminUser) {
                adminUser.winnings += adminCommission; // Credit commission as withdrawable balance
                await adminUser.save();

                // Save admin commission transaction
                const commissionTx = new Transaction({
                    user: adminUser._id,
                    type: 'commission',
                    amount: adminCommission,
                    detail: `Commission: ${match.title} (${totalPlayers} players, Collection: ₹${totalCollection})`,
                    status: 'success'
                });
                await commissionTx.save();
            }
        }

        match.status = 'completed';
        await match.save();

        // Broadcast Telegram Notification
        await sendTelegramAlert(
            `🏆 <b>Match Result Resolved</b>\n\n` +
            `⚔️ Match: <b>${match.title}</b>\n` +
            `🥇 Booyah: <b>${booyahWinner}</b>\n` +
            `🎁 Prize Paid: <b>₹${match.prizePool}</b>\n` +
            `💼 Admin Comm: <b>₹${adminCommission}</b>`
        );

        res.json({ success: true, msg: 'Match resolved and payments completed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
