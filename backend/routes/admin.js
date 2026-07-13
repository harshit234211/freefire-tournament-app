const express = require('express');
const router = express.Router();
const { authenticate, restrictTo } = require('../middleware/auth');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Transaction = require('../models/Transaction');
const Announcement = require('../models/Announcement');

// Apply admin protection to all routes in this router
router.use([authenticate, restrictTo('admin')]);

// @route   GET api/admin/users
// @desc    Get all users list
// @access  Private (Admin only)
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/users/:id/role
// @desc    Change user role (Promote to host/demote to player)
// @access  Private (Admin only)
router.put('/users/:id/role', async (req, res) => {
    const { role } = req.body; // 'player' or 'host'

    try {
        if (!['player', 'host'].includes(role)) {
            return res.status(400).json({ msg: 'Invalid role selection' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.role = role;
        await user.save();

        res.json({ msg: `User role updated to ${role} successfully`, user: { id: user._id, username: user.username, role: user.role } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/withdrawals
// @desc    Get all pending withdrawal requests
// @access  Private (Admin only)
router.get('/withdrawals', async (req, res) => {
    try {
        const pendingWithdrawals = await Transaction.find({ type: 'withdrawal', status: 'pending' })
            .populate('user', 'username phone')
            .sort({ date: 1 });
        res.json(pendingWithdrawals);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/admin/withdrawals/:id/resolve
// @desc    Approve or reject a withdrawal request
// @access  Private (Admin only)
router.post('/withdrawals/:id/resolve', async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'

    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction || transaction.type !== 'withdrawal' || transaction.status !== 'pending') {
            return res.status(404).json({ msg: 'Pending withdrawal request not found' });
        }

        const user = await User.findById(transaction.user);
        if (!user) {
            return res.status(404).json({ msg: 'User not found for this transaction' });
        }

        if (action === 'approve') {
            transaction.status = 'success';
            transaction.detail = 'Withdrawal request approved and processed by Admin';
        } else if (action === 'reject') {
            transaction.status = 'failed';
            transaction.detail = 'Withdrawal request rejected by Admin';
            
            // Refund the deducted winnings back to the player
            user.winnings += transaction.amount;
            await user.save();
        } else {
            return res.status(400).json({ msg: 'Invalid action parameter' });
        }

        await transaction.save();
        res.json({ msg: `Withdrawal request successfully ${action}d`, transaction });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/admin/tournaments/create
// @desc    Create a new tournament and assign a host
// @access  Private (Admin only)
router.post('/tournaments/create', async (req, res) => {
    const { 
        title, map, mode, prizePool, perKill, entryFee, totalSlots, date, time, assignedHost,
        skills, attributes, bodyShot, weapons, unlimitedAmmo, roomType 
    } = req.body;

    try {
        if (!title || !map || !mode || !prizePool || !perKill || !entryFee || !totalSlots || !date || !time) {
            return res.status(400).json({ msg: 'Please enter all tournament specifications' });
        }

        // Validate assigned host if provided
        let hostId = null;
        if (assignedHost) {
            const hostUser = await User.findById(assignedHost);
            if (!hostUser || hostUser.role !== 'host') {
                return res.status(400).json({ msg: 'Assigned user must exist and have the Host role' });
            }
            hostId = hostUser._id;
        }

        const match = new Tournament({
            title,
            map,
            mode,
            prizePool: parseFloat(prizePool),
            perKill: parseFloat(perKill),
            entryFee: parseFloat(entryFee),
            totalSlots: parseInt(totalSlots),
            date,
            time,
            assignedHost: hostId,
            skills: skills === true || skills === 'true',
            attributes: attributes === true || attributes === 'true',
            bodyShot: bodyShot !== false && bodyShot !== 'false',
            weapons: weapons || 'All',
            unlimitedAmmo: unlimitedAmmo === true || unlimitedAmmo === 'true',
            roomType: roomType || 'Normal'
        });

        await match.save();
        res.json(match);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/admin/tournaments/:id
// @desc    Delete/Cancel a tournament match (Auto refund entry fees)
// @access  Private (Admin only)
router.delete('/tournaments/:id', async (req, res) => {
    try {
        const match = await Tournament.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ msg: 'Match not found' });
        }

        // Refund entry fees for all joined players
        if (match.entryFee > 0 && match.joinedPlayers.length > 0) {
            for (const p of match.joinedPlayers) {
                const user = await User.findById(p.user);
                if (user) {
                    user.coins += match.entryFee;
                    await user.save();

                    // Create transaction log
                    const refundTx = new Transaction({
                        user: user._id,
                        type: 'deposit',
                        amount: match.entryFee,
                        detail: `Refund for cancelled tournament: ${match.title}`,
                        status: 'success'
                    });
                    await refundTx.save();
                }
            }
            console.log(`Auto-refunded entry fees to ${match.joinedPlayers.length} players for match: ${match.title}`);
        }

        // Delete match document from database
        await Tournament.findByIdAndDelete(req.params.id);
        res.json({ msg: `Match "${match.title}" successfully cancelled. Refunded entry fees to ${match.joinedPlayers.length} warriors.` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/admin/announcements/create
// @desc    Create a system announcement/notification
// @access  Private (Admin only)
router.post('/announcements/create', async (req, res) => {
    const { title, content, type } = req.body; // type: 'general', 'match', 'winner'

    try {
        if (!title || !content) {
            return res.status(400).json({ msg: 'Please provide both title and content' });
        }

        const announcement = new Announcement({
            title,
            content,
            type: type || 'general'
        });

        await announcement.save();
        res.json(announcement);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/deposits
// @desc    Get all successful deposit logs
// @access  Private (Admin only)
router.get('/deposits', async (req, res) => {
    try {
        const depositLogs = await Transaction.find({ type: 'deposit', status: 'success' })
            .populate('user', 'username phone')
            .sort({ date: -1 });
        res.json(depositLogs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



// @route   GET api/admin/earnings
// @desc    Get admin commission earnings & financial stats
// @access  Private (Admin only)
router.get('/earnings', async (req, res) => {
    try {
        const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
        
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0,0,0,0);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        const startOfYear = new Date();
        startOfYear.setMonth(0, 1);
        startOfYear.setHours(0,0,0,0);

        // Fetch all commission transactions populated with user details
        const commissionTxList = await Transaction.find({ type: 'commission' })
            .populate('user', 'username phone')
            .sort({ date: -1 });

        let todayEarnings = 0;
        let weeklyEarnings = 0;
        let monthlyEarnings = 0;
        let yearlyEarnings = 0;
        let lifetimeEarnings = 0;

        commissionTxList.forEach(tx => {
            const txDate = new Date(tx.date);
            lifetimeEarnings += tx.amount;
            if (txDate >= startOfToday) todayEarnings += tx.amount;
            if (txDate >= startOfWeek) weeklyEarnings += tx.amount;
            if (txDate >= startOfMonth) monthlyEarnings += tx.amount;
            if (txDate >= startOfYear) yearlyEarnings += tx.amount;
        });

        // Fetch completed matches to calculate total collections & payouts
        const completedMatches = await Tournament.find({ status: 'completed' });
        let totalCollection = 0;
        let totalPayout = 0;

        completedMatches.forEach(m => {
            const playersCount = m.joinedPlayers.length;
            totalCollection += m.entryFee * playersCount;
            totalPayout += m.prizePool;
        });

        // Calculate Analytics
        const totalUsers = await User.countDocuments();
        
        const todayRegistrations = await Transaction.countDocuments({
            type: 'entryfee',
            date: { $gte: startOfToday }
        });

        const todayDepositsList = await Transaction.find({
            type: 'deposit',
            status: 'success',
            date: { $gte: startOfToday }
        });
        const todayDeposits = todayDepositsList.reduce((sum, tx) => sum + tx.amount, 0);

        const todayWithdrawalsList = await Transaction.find({
            type: 'withdrawal',
            status: 'success',
            date: { $gte: startOfToday }
        });
        const todayWithdrawals = todayWithdrawalsList.reduce((sum, tx) => sum + tx.amount, 0);

        res.json({
            totalCollection,
            totalPayout,
            netCommission: lifetimeEarnings,
            todayEarnings,
            weeklyEarnings,
            monthlyEarnings,
            yearlyEarnings,
            lifetimeEarnings,
            analytics: {
                totalUsers,
                todayRegistrations,
                todayRevenue: todayEarnings,
                todayDeposits,
                todayWithdrawals
            },
            transactions: commissionTxList
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
