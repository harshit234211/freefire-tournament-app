const express = require('express');
const router = express.Router();
const { authenticate, restrictTo } = require('../middleware/auth');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Announcement = require('../models/Announcement');

// @route   GET api/host/assigned-matches
// @desc    Get matches assigned to this host
// @access  Private (Host/Admin only)
router.get('/assigned-matches', [authenticate, restrictTo('host', 'admin')], async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { assignedHost: req.user.id };
        const matches = await Tournament.find(query).sort({ date: -1 });
        res.json(matches);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/host/:id/room
// @desc    Update Room Credentials for a match
// @access  Private (Host/Admin only)
router.post('/:id/room', [authenticate, restrictTo('host', 'admin')], async (req, res) => {
    const { roomId, roomPassword } = req.body;

    try {
        const match = await Tournament.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ msg: 'Match not found' });
        }

        // Verify host assignment
        if (req.user.role !== 'admin' && match.assignedHost.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized. You are not the assigned host for this match.' });
        }

        match.roomId = roomId;
        match.roomPassword = roomPassword;

        // If credentials are set, flip status to ongoing (live)
        if (roomId && roomPassword && match.status === 'upcoming') {
            match.status = 'ongoing';

            // Auto-create a match reminder/alert announcement!
            const alertAnnouncement = new Announcement({
                title: `Room Credentials Released!`,
                content: `Room ID and Password are now active for "${match.title}". Join the custom lobby immediately!`,
                type: 'match'
            });
            await alertAnnouncement.save();
        }

        await match.save();
        res.json(match);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/host/:id/resolve
// @desc    Resolve standings, distribute prize pool, complete match
// @access  Private (Host/Admin only)
router.post('/:id/resolve', [authenticate, restrictTo('host', 'admin')], async (req, res) => {
    const { playerResults } = req.body; // Array: [{ uid: 'UID', kills: 4, rank: 1 }]

    try {
        const match = await Tournament.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ msg: 'Match not found' });
        }

        if (req.user.role !== 'admin' && match.assignedHost.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized. You are not the assigned host for this match.' });
        }

        if (match.status === 'completed') {
            return res.status(400).json({ msg: 'Match is already resolved' });
        }

        // Find Rank 1 winners to distribute the Winner Prize (prizePool)
        const rank1Winners = playerResults.filter(p => parseInt(p.rank) === 1);
        const prizePerWinner = rank1Winners.length > 0 ? (match.prizePool / rank1Winners.length) : 0;
        let booyahWinner = 'Unknown';

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
                await user.save();

                // Save winning transaction
                const transaction = new Transaction({
                    user: user._id,
                    type: 'winning',
                    amount: winnings,
                    detail: `Winnings for match: ${match.title} (Rank: ${rankNum}, Kills: ${killNum})`,
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
                    detail: `Admin Commission for match: ${match.title} (${totalPlayers} players joined, Collection: ₹${totalCollection})`,
                    status: 'success'
                });
                await commissionTx.save();
                console.log(`Auto-credited commission of ₹${adminCommission} to Admin wallet.`);
            }
        }

        match.status = 'completed';
        await match.save();

        // Auto-create Winner announcement
        const winnerAnnouncement = new Announcement({
            title: `BOOYAH Announcement!`,
            content: `"${match.title}" has been completed! Booyah claimed by player: ${booyahWinner}. Winnings have been credited to all wallets!`,
            type: 'winner'
        });
        await winnerAnnouncement.save();

        res.json({ msg: 'Match resolved successfully', match });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
