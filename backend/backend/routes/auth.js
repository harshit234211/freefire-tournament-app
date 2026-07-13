const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Register a player
// @access  Public
router.post('/register', async (req, res) => {
    const { username, phone, password } = req.body;

    if (!username || !phone || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        let user = await User.findOne({ $or: [{ phone }, { username }] });
        if (user) {
            return res.status(400).json({ msg: 'User with this phone or username already exists' });
        }

        user = new User({ username, phone, password });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'fragarena_secret_token',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, username: user.username, phone: user.phone, role: user.role } });
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

    if (!phone || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        let user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'fragarena_secret_token',
            { expiresIn: 360000 },
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

// @route   GET api/auth/me
// @desc    Get current user details
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('clan', 'name tag');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/auth/profile
// @desc    Update Free Fire profile details
// @access  Private
router.put('/profile', auth, async (req, res) => {
    const { ffName, ffUid } = req.body;

    if (!ffName || !ffUid) {
        return res.status(400).json({ msg: 'IGN and Character UID are required' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.ffName = ffName;
        user.ffUid = ffUid;
        await user.save();

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
