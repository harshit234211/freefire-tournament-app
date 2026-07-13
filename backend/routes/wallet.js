const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @route   GET api/wallet/transactions
// @desc    Get user transactions history
// @access  Private
router.get('/transactions', authenticate, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id }).sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/wallet/deposit/order
// @desc    Create a Cashfree payment order
// @access  Private
router.post('/deposit/order', authenticate, async (req, res) => {
    const { amount } = req.body;

    try {
        const depAmt = parseFloat(amount);
        if (isNaN(depAmt) || depAmt < 10) {
            return res.status(400).json({ msg: 'Minimum deposit amount is ₹10' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const orderId = `order_${Date.now()}`;

        // Create transaction entry as pending
        const transaction = new Transaction({
            user: user._id,
            type: 'deposit',
            amount: depAmt,
            detail: 'Cashfree Deposit Order',
            status: 'pending',
            cashfreeOrderId: orderId
        });
        await transaction.save();

        const cashfreeAppId = process.env.CASHFREE_APP_ID;
        const cashfreeSecret = process.env.CASHFREE_SECRET_KEY;
        const isSandbox = (process.env.CASHFREE_ENV || 'TEST') === 'TEST';
        
        // If keys are placeholder/defaults, bypass real Cashfree API and simulate sandbox
        if (cashfreeAppId.startsWith('TEST102938') || !cashfreeSecret) {
            console.log('Using simulated Cashfree checkout token.');
            return res.json({
                simulated: true,
                orderId: orderId,
                amount: depAmt,
                paymentSessionId: `session_${Date.now()}_simulated`
            });
        }

        // Call real Cashfree REST API
        const cashfreeUrl = isSandbox 
            ? 'https://sandbox.cashfree.com/pg/orders'
            : 'https://api.cashfree.com/pg/orders';

        const response = await fetch(cashfreeUrl, {
            method: 'POST',
            headers: {
                'x-client-id': cashfreeAppId,
                'x-client-secret': cashfreeSecret,
                'x-api-version': '2022-09-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: orderId,
                order_amount: depAmt,
                order_currency: 'INR',
                customer_details: {
                    customer_id: user._id.toString(),
                    customer_phone: user.phone
                }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('Cashfree order creation error:', data);
            return res.status(400).json({ msg: 'Payment order creation failed on Cashfree', error: data });
        }

        res.json({
            simulated: false,
            orderId: data.order_id,
            amount: data.order_amount,
            paymentSessionId: data.payment_session_id
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error during Cashfree order initiation');
    }
});

// @route   POST api/wallet/deposit/verify
// @desc    Verify Cashfree payment order status
// @access  Private
router.post('/deposit/verify', authenticate, async (req, res) => {
    const { orderId, isSimulatedSuccess } = req.body;

    try {
        const transaction = await Transaction.findOne({ cashfreeOrderId: orderId, status: 'pending' });
        if (!transaction) {
            return res.status(404).json({ msg: 'Pending transaction order not found' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Check if simulated success
        if (isSimulatedSuccess) {
            transaction.status = 'success';
            transaction.detail = 'Simulated Cashfree Checkout Success';
            user.coins += transaction.amount;
            
            await transaction.save();
            await user.save();

            return res.json({
                success: true,
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
        }

        // Real Cashfree API Verification
        const cashfreeAppId = process.env.CASHFREE_APP_ID;
        const cashfreeSecret = process.env.CASHFREE_SECRET_KEY;
        const isSandbox = (process.env.CASHFREE_ENV || 'TEST') === 'TEST';

        const cashfreeUrl = isSandbox 
            ? `https://sandbox.cashfree.com/pg/orders/${orderId}`
            : `https://api.cashfree.com/pg/orders/${orderId}`;

        const response = await fetch(cashfreeUrl, {
            headers: {
                'x-client-id': cashfreeAppId,
                'x-client-secret': cashfreeSecret,
                'x-api-version': '2022-09-01'
            }
        });

        const data = await response.json();

        if (response.ok && data.order_status === 'PAID') {
            transaction.status = 'success';
            transaction.detail = `Cashfree Payment verified via ${data.payments?.[0]?.payment_method || 'Gateway'}`;
            user.coins += transaction.amount;
            
            await transaction.save();
            await user.save();

            res.json({
                success: true,
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
        } else {
            transaction.status = 'failed';
            transaction.detail = 'Cashfree Payment unpaid/failed verification';
            await transaction.save();
            res.json({ success: false, msg: 'Payment verification failed' });
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error during payment verification');
    }
});

// @route   POST api/wallet/withdraw
// @desc    Place a withdrawal request (Deducts balance immediately, puts in pending status)
// @access  Private
router.post('/withdraw', authenticate, async (req, res) => {
    const { amount, method, details } = req.body;

    try {
        const withdrawAmt = parseFloat(amount);
        if (isNaN(withdrawAmt) || withdrawAmt < 50) {
            return res.status(400).json({ msg: 'Minimum withdrawal amount is ₹50' });
        }

        if (!details) {
            return res.status(400).json({ msg: 'Please enter payment credentials (e.g. UPI ID/Paytm)' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.winnings < withdrawAmt) {
            return res.status(400).json({ msg: `Insufficient winnings balance. You only have ₹${user.winnings} in winnings.` });
        }

        // Deduct from winnings immediately
        user.winnings -= withdrawAmt;

        const transaction = new Transaction({
            user: user._id,
            type: 'withdrawal',
            amount: withdrawAmt,
            detail: `Withdrawal request via ${method.toUpperCase()}`,
            status: 'pending',
            paymentDetails: details
        });

        await user.save();
        await transaction.save();

        res.json({
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
            },
            transaction
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error during withdrawal request');
    }
});

module.exports = router;
