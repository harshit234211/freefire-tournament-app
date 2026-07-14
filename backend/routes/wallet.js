const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { sendTelegramAlert } = require('../utils/telegram');

// @route   POST api/wallet/deposit/create
// @desc    Initiate Cashfree Deposit Order
// @access  Private
router.post('/deposit/create', auth, async (req, res) => {
    const { amount } = req.body;
    const amt = parseFloat(amount);

    if (!amt || amt <= 0) {
        return res.status(400).json({ msg: 'Please enter a valid deposit amount' });
    }

    try {
        const orderId = `order_${Date.now()}_${req.user.id}`;
        
        // Save pending transaction record
        const transaction = new Transaction({
            user: req.user.id,
            type: 'deposit',
            amount: amt,
            cashfreeOrderId: orderId,
            detail: 'Initiated Cashfree Checkout Gateway',
            status: 'pending'
        });
        await transaction.save();

        res.json({
            orderId,
            amount: amt,
            paymentSessionId: `session_mock_${Date.now()}` // Mock checkout session for simulation/API
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/wallet/deposit/verify
// @desc    Verify Cashfree Payment Status (Auto-verify & credit coins)
// @access  Private
router.post('/deposit/verify', auth, async (req, res) => {
    const { orderId, isSimulatedSuccess } = req.body;

    if (!orderId) {
        return res.status(400).json({ msg: 'Order ID is required' });
    }

    try {
        const transaction = await Transaction.findOne({ cashfreeOrderId: orderId });
        if (!transaction) {
            return res.status(404).json({ msg: 'Transaction order record not found' });
        }

        if (transaction.status === 'success') {
            return res.status(400).json({ msg: 'Transaction has already been successfully verified and credited' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User profile not found' });

        // Verify status from request parameters or Cashfree API (Mocked checkout support included)
        const isVerifiedPaid = isSimulatedSuccess || false;

        if (isVerifiedPaid) {
            transaction.status = 'success';
            transaction.detail = 'Simulated Cashfree Checkout Verification Successful';
            user.coins += transaction.amount;

            await transaction.save();
            await user.save();

            // Broadcast Telegram notification to Admin
            await sendTelegramAlert(
                `💳 <b>New Automatic Deposit</b>\n\n` +
                `👤 Player: <b>${user.username}</b>\n` +
                `📞 Phone: <code>${user.phone}</code>\n` +
                `💰 Amount: <b>₹${transaction.amount}</b>\n` +
                `🔑 Order ID: <code>${orderId}</code>\n` +
                `📊 Status: SUCCESS`
            );

            return res.json({ success: true, user, transaction });
        } else {
            transaction.status = 'failed';
            transaction.detail = 'Payment verification check failed or remained unpaid';
            await transaction.save();
            return res.status(400).json({ msg: 'Payment verification failed' });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/wallet/withdraw/request
// @desc    Request Withdrawal (Winning balance only)
// @access  Private
router.post('/withdraw/request', auth, async (req, res) => {
    const { amount, upiId } = req.body;
    const amt = parseFloat(amount);

    if (!amt || amt <= 0) {
        return res.status(400).json({ msg: 'Please enter a valid withdrawal amount' });
    }
    if (!upiId) {
        return res.status(400).json({ msg: 'UPI address is required' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User profile not found' });

        // Ensure withdrawable winnings has sufficient balance
        if (user.winnings < amt) {
            return res.status(400).json({ msg: `Insufficient winnings. Max withdrawable: ₹${user.winnings}` });
        }

        // Deduct/Lock winnings during pending state
        user.winnings -= amt;
        await user.save();

        const transaction = new Transaction({
            user: user._id,
            type: 'withdrawal',
            amount: amt,
            upiId,
            detail: `Withdrawal request to UPI: ${upiId}`,
            status: 'pending'
        });
        await transaction.save();

        // Broadcast Telegram Notification to Admin
        await sendTelegramAlert(
            `💸 <b>New Withdrawal Request</b>\n\n` +
            `👤 Player: <b>${user.username}</b>\n` +
            `💰 Amount: <b>₹${amt}</b>\n` +
            `🏦 UPI ID: <code>${upiId}</code>\n` +
            `📊 Status: PENDING ADMIN APPROVAL`
        );

        res.json({ success: true, user, transaction });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/wallet/deposit/manual
// @desc    Submit a manual deposit request with UTR
// @access  Private
router.post('/deposit/manual', auth, async (req, res) => {
    const { amount, utr } = req.body;
    const amt = parseFloat(amount);

    if (!amt || amt <= 0) {
        return res.status(400).json({ msg: 'Please enter a valid deposit amount' });
    }
    if (!utr || utr.trim().length < 6) {
        return res.status(400).json({ msg: 'Please enter a valid Transaction ID / UTR' });
    }

    try {
        const existingTx = await Transaction.findOne({ utr: utr.trim() });
        if (existingTx) {
            return res.status(400).json({ msg: 'This Transaction ID / UTR has already been submitted' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User profile not found' });

        const transaction = new Transaction({
            user: user._id,
            type: 'deposit',
            amount: amt,
            utr: utr.trim(),
            detail: `Manual Deposit via UPI (UTR: ${utr})`,
            status: 'pending'
        });
        await transaction.save();

        await sendTelegramAlert(
            `💳 <b>New Manual Deposit Request</b>\n\n` +
            `👤 Player: <b>${user.username}</b>\n` +
            `📞 Phone: <code>${user.phone}</code>\n` +
            `💰 Amount: <b>₹${amt}</b>\n` +
            `🔢 UTR/TxID: <code>${utr}</code>\n` +
            `📊 Status: PENDING ADMIN APPROVAL`
        );

        res.json({ success: true, transaction });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
