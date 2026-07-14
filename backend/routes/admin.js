const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Transaction = require('../models/Transaction');
const { sendTelegramAlert } = require('../utils/telegram');

// Middleware to verify Admin role
const verifyAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied: Admin permissions required' });
        }
        next();
    } catch (err) {
        res.status(500).send('Server security error');
    }
};

// @route   GET api/admin/stats
// @desc    Get dashboard stats (Total users, deposits, withdrawals)
// @access  Private (Admin only)
router.get('/stats', auth, verifyAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        
        const deposits = await Transaction.aggregate([
            { $match: { type: 'deposit', status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalDeposits = deposits[0] ? deposits[0].total : 0;

        const pendingDeposits = await Transaction.aggregate([
            { $match: { type: 'deposit', status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalPendingDeposits = pendingDeposits[0] ? pendingDeposits[0].total : 0;

        const withdrawals = await Transaction.aggregate([
            { $match: { type: 'withdrawal', status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalWithdrawals = withdrawals[0] ? withdrawals[0].total : 0;

        const pendingWithdrawals = await Transaction.aggregate([
            { $match: { type: 'withdrawal', status: 'pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalPendingWithdrawals = pendingWithdrawals[0] ? pendingWithdrawals[0].total : 0;

        res.json({
            totalUsers,
            totalDeposits,
            totalPendingDeposits,
            totalWithdrawals,
            totalPendingWithdrawals
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/users
// @desc    Get all users list
// @access  Private (Admin only)
router.get('/users', auth, verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ date: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/admin/hosts/create
// @desc    Create a Host account
// @access  Private (Admin only)
router.post('/hosts/create', auth, verifyAdmin, async (req, res) => {
    const { username, phone, password } = req.body;

    if (!username || !phone || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        let hostUser = await User.findOne({ phone });
        if (hostUser) {
            return res.status(400).json({ msg: 'Phone number already registered' });
        }

        hostUser = new User({
            username,
            phone,
            password,
            role: 'host' // Force Host role
        });

        const salt = await bcrypt.genSalt(10);
        hostUser.password = await bcrypt.hash(password, salt);
        await hostUser.save();

        res.json({ success: true, host: { id: hostUser.id, username: hostUser.username, phone: hostUser.phone } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/withdrawals
// @desc    Get all pending withdrawal requests
// @access  Private (Admin only)
router.get('/withdrawals', auth, verifyAdmin, async (req, res) => {
    try {
        const withdrawals = await Transaction.find({ type: 'withdrawal', status: 'pending' })
            .populate('user', 'username phone')
            .sort({ date: 1 });
        res.json(withdrawals);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/admin/withdrawals/:id/resolve
// @desc    Approve or Reject withdrawal request
// @access  Private (Admin only)
router.post('/withdrawals/:id/resolve', auth, verifyAdmin, async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'

    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction || transaction.type !== 'withdrawal' || transaction.status !== 'pending') {
            return res.status(404).json({ msg: 'Pending withdrawal request not found' });
        }

        const user = await User.findById(transaction.user);
        if (!user) return res.status(404).json({ msg: 'User profile not found' });

        if (action === 'approve') {
            transaction.status = 'success';
            transaction.detail = 'Withdrawal processed and transfer approved by Admin';
            await transaction.save();

            // Notify Admin via Telegram
            await sendTelegramAlert(
                `✅ <b>Withdrawal Request Approved</b>\n\n` +
                `👤 Player: <b>${user.username}</b>\n` +
                `💰 Amount: <b>₹${transaction.amount}</b>\n` +
                `🏦 UPI ID: <code>${transaction.upiId}</code>\n` +
                `📊 Status: SUCCESSFUL`
            );
        } else if (action === 'reject') {
            transaction.status = 'failed';
            transaction.detail = 'Withdrawal request rejected by Admin. Refunded to wallet winnings.';
            
            // Refund locked coins back to winning wallet
            user.winnings += transaction.amount;
            await user.save();
            await transaction.save();

            // Notify Admin via Telegram
            await sendTelegramAlert(
                `❌ <b>Withdrawal Request Rejected</b>\n\n` +
                `👤 Player: <b>${user.username}</b>\n` +
                `💰 Amount: <b>₹${transaction.amount}</b>\n` +
                `🏦 UPI ID: <code>${transaction.upiId}</code>\n` +
                `📊 Status: REJECTED & REFUNDED`
            );
        } else {
            return res.status(400).json({ msg: 'Invalid action parameter' });
        }

        res.json({ success: true, transaction });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/admin/tournaments/create
// @desc    Launch/Create a tournament match
// @access  Private (Admin only)
router.post('/tournaments/create', auth, verifyAdmin, async (req, res) => {
    const { title, category, date, time, entryFee, prizePool, perKill, totalSlots, hostId, settings } = req.body;

    if (!title || !category || !date || !time || entryFee === undefined || prizePool === undefined || !totalSlots || !hostId) {
        return res.status(400).json({ msg: 'Please enter all required fields' });
    }

    try {
        const tournament = new Tournament({
            title,
            category,
            date,
            time,
            entryFee,
            prizePool,
            perKill,
            totalSlots,
            host: hostId,
            settings: settings || {}
        });

        await tournament.save();

        // Notify Admin via Telegram
        await sendTelegramAlert(
            `🎮 <b>New Tournament Created</b>\n\n` +
            `🏆 Title: <b>${title}</b>\n` +
            `⚔️ Mode: <b>${category}</b>\n` +
            `⏰ Time: <b>${date} at ${time}</b>\n` +
            `💰 Entry Fee: <b>₹${entryFee}</b>\n` +
            `🎁 Prize Pool: <b>₹${prizePool}</b>`
        );

        res.json({ success: true, tournament });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/admin/earnings
// @desc    Get admin commission earnings & system analytics
// @access  Private (Admin only)
router.get('/earnings', auth, verifyAdmin, async (req, res) => {
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

        // Fetch all commission transactions
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

        // Calculate System Analytics
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

// @route   GET api/admin/deposits
// @desc    Get all pending manual deposit requests
// @access  Private (Admin only)
router.get('/deposits', auth, verifyAdmin, async (req, res) => {
    try {
        const deposits = await Transaction.find({ type: 'deposit', status: 'pending' })
            .populate('user', 'username phone')
            .sort({ date: 1 });
        res.json(deposits);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/admin/deposits/:id/resolve
// @desc    Approve or Reject manual deposit request
// @access  Private (Admin only)
router.post('/deposits/:id/resolve', auth, verifyAdmin, async (req, res) => {
    const { action } = req.body; // 'approve' or 'reject'

    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction || transaction.type !== 'deposit' || transaction.status !== 'pending') {
            return res.status(404).json({ msg: 'Pending deposit request not found' });
        }

        const user = await User.findById(transaction.user);
        if (!user) return res.status(404).json({ msg: 'User profile not found' });

        if (action === 'approve') {
            transaction.status = 'success';
            transaction.detail = `Manual deposit approved by Admin. UTR: ${transaction.utr}`;
            await transaction.save();

            // Credit coins to user wallet
            user.coins += transaction.amount;
            await user.save();

            // Notify via Telegram
            await sendTelegramAlert(
                `✅ <b>Manual Deposit Request Approved</b>\n\n` +
                `👤 Player: <b>${user.username}</b>\n` +
                `💰 Amount: <b>₹${transaction.amount}</b> credited as coins\n` +
                `🔢 UTR/TxID: <code>${transaction.utr}</code>\n` +
                `📊 Status: SUCCESSFUL`
            );
        } else if (action === 'reject') {
            transaction.status = 'failed';
            transaction.detail = `Manual deposit request rejected by Admin. UTR: ${transaction.utr}`;
            await transaction.save();

            // Notify via Telegram
            await sendTelegramAlert(
                `❌ <b>Manual Deposit Request Rejected</b>\n\n` +
                `👤 Player: <b>${user.username}</b>\n` +
                `💰 Amount: <b>₹${transaction.amount}</b>\n` +
                `🔢 UTR/TxID: <code>${transaction.utr}</code>\n` +
                `📊 Status: REJECTED`
            );
        } else {
            return res.status(400).json({ msg: 'Invalid action parameter' });
        }

        res.json({ success: true, transaction });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

const Schedule = require('../models/Schedule');

// @route   GET api/admin/schedules
// @desc    Get all daily schedules
// @access  Private (Admin only)
router.get('/schedules', auth, verifyAdmin, async (req, res) => {
    try {
        const schedules = await Schedule.find().sort({ time: 1 });
        res.json(schedules);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/admin/schedules
// @desc    Create a new daily schedule template
// @access  Private (Admin only)
router.post('/schedules', auth, verifyAdmin, async (req, res) => {
    const { time, category, title, entryFee, prizePool, perKill, totalSlots, teamType, mode, map, matchType, rules, prizeDistribution, notice } = req.body;

    if (!time || !category || !title || !entryFee || !prizePool) {
        return res.status(400).json({ msg: 'Please fill all required fields' });
    }

    try {
        const newSched = new Schedule({
            time, category, title,
            entryFee: parseInt(entryFee),
            prizePool: parseInt(prizePool),
            perKill: parseInt(perKill || 0),
            totalSlots: parseInt(totalSlots || 20),
            teamType: teamType || 'Solo',
            mode: mode || 'Solo',
            map: map || 'Bermuda',
            matchType: matchType || 'Paid',
            rules: Array.isArray(rules) ? rules : (rules ? rules.split('\n').filter(r => r.trim()) : []),
            prizeDistribution: Array.isArray(prizeDistribution) ? prizeDistribution : [],
            notice: notice || ''
        });

        await newSched.save();
        res.json({ success: true, schedule: newSched });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/admin/schedules/:id
// @desc    Update / Enable / Disable a schedule template
// @access  Private (Admin only)
router.put('/schedules/:id', auth, verifyAdmin, async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) return res.status(404).json({ msg: 'Schedule template not found' });

        const fieldsToUpdate = req.body;
        
        for (const [key, value] of Object.entries(fieldsToUpdate)) {
            schedule[key] = value;
        }

        await schedule.save();
        res.json({ success: true, schedule });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/admin/schedules/:id
// @desc    Delete a daily schedule template
// @access  Private (Admin only)
router.delete('/schedules/:id', auth, verifyAdmin, async (req, res) => {
    try {
        const schedule = await Schedule.findByIdAndDelete(req.params.id);
        if (!schedule) return res.status(404).json({ msg: 'Schedule template not found' });

        res.json({ success: true, msg: 'Schedule template deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
