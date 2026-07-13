const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Register a new user (Phone & Password, no OTP)
// @access  Public
router.post('/register', async (req, res) => {
    const { username, phone, password } = req.body;

    try {
        if (!username || !phone || !password) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        // Validate username formatting (no spaces)
        if (/\s/.test(username)) {
            return res.status(400).json({ msg: 'Username cannot contain spaces' });
        }

        // Check if user exists
        let user = await User.findOne({ $or: [{ username }, { phone }] });
        if (user) {
            return res.status(400).json({ msg: 'User with this phone number or username already exists' });
        }

        user = new User({
            username,
            phone,
            password
        });

        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Sign token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'supersecuresecretkey',
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
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
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { phone, password } = req.body;

    try {
        if (!phone || !password) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        // Check user
        let user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Match password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Sign token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'supersecuresecretkey',
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
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
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/auth/profile
// @desc    Update user profile Free Fire details
// @access  Private
router.put('/profile', authenticate, async (req, res) => {
    const { username, ffName, ffUid } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (username) {
            if (/\s/.test(username)) {
                return res.status(400).json({ msg: 'Username cannot contain spaces' });
            }
            const usernameTaken = await User.findOne({ username, _id: { $ne: req.user.id } });
            if (usernameTaken) {
                return res.status(400).json({ msg: 'Username is already taken' });
            }
            user.username = username;
        }

        if (ffName !== undefined) user.ffName = ffName;
        if (ffUid !== undefined) user.ffUid = ffUid;

        await user.save();
        res.json({
            id: user.id,
            username: user.username,
            phone: user.phone,
            role: user.role,
            coins: user.coins,
            winnings: user.winnings,
            ffName: user.ffName,
            ffUid: user.ffUid,
            stats: user.stats
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
