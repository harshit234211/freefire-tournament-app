const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

require('dotenv').config();

const app = express();

// CORS Whitelist Configuration
const allowedOrigins = [
    'https://frontend-sigma-rose-73.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    credentials: true
}));

// Pre-flight options handler
app.options('*', cors());
app.use(express.json());

// Database connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/fragarena';
mongoose.connect(mongoUri)
    .then(async () => {
        console.log('MongoDB Connected successfully to Cloud Atlas!');
        
        // Seed default Admin
        try {
            const adminPhone = '7017022966';
            const adminPassword = 'harshit9090@@()';
            let admin = await User.findOne({ phone: adminPhone });
            
            if (!admin) {
                admin = new User({
                    username: 'harshit_admin',
                    phone: adminPhone,
                    password: adminPassword,
                    role: 'admin'
                });
                
                const salt = await bcrypt.genSalt(10);
                admin.password = await bcrypt.hash(adminPassword, salt);
                await admin.save();
                console.log('Admin Account seeded: Phone 7017022966, Password harshit9090@@()');
            } else {
                // Ensure correct password and admin role
                const salt = await bcrypt.genSalt(10);
                admin.password = await bcrypt.hash(adminPassword, salt);
                admin.role = 'admin';
                await admin.save();
                console.log('Admin Account verified and synced!');
            }

            // Seed default schedules if empty
            const Schedule = require('./models/Schedule');
            const scheduleCount = await Schedule.countDocuments();
            if (scheduleCount === 0) {
                const defaultSchedules = [
                    { time: '09:00 AM', category: 'Lone Wolf 1v1', title: 'Lone Wolf 1v1 - ₹15 Entry', entryFee: 15, prizePool: 25, perKill: 0, totalSlots: 2, teamType: 'Solo', mode: 'Solo', map: 'Bermuda', matchType: 'Paid', rules: ['Level 40+ required', 'No hacks/cheats'] },
                    { time: '12:00 PM', category: 'Clash Squad 4v4', title: 'CS 4v4 - ₹40 Entry', entryFee: 40, prizePool: 280, perKill: 0, totalSlots: 8, teamType: 'Squad', mode: '4v4', map: 'Bermuda', matchType: 'Paid', rules: ['Screenshot required', 'Double vector banned'] },
                    { time: '04:00 PM', category: 'BR Survival', title: 'BR Squad - ₹50 Entry', entryFee: 50, prizePool: 2000, perKill: 5, totalSlots: 48, teamType: 'Squad', mode: 'Solo', map: 'Bermuda', matchType: 'Paid', rules: ['Recording compulsory', 'All weapons allowed'] }
                ];
                await Schedule.insertMany(defaultSchedules);
                console.log('Default daily tournament schedules seeded!');
            }
        } catch (seedErr) {
            console.error('Error seeding admin account/schedules:', seedErr.message);
        }
    })
    .catch(err => {
        console.error('Database connection error:', err.message);
    });

// API Routes (with /api prefix)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/clans', require('./routes/clans'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/host', require('./routes/host'));

// API Routes (without /api prefix - for backward compatibility)
app.use('/auth', require('./routes/auth'));
app.use('/tournaments', require('./routes/tournaments'));
app.use('/wallet', require('./routes/wallet'));
app.use('/clans', require('./routes/clans'));
app.use('/admin', require('./routes/admin'));
app.use('/host', require('./routes/host'));

// Root endpoint
app.get('/', (req, res) => {
    res.json({ msg: 'Welcome to the FragArena API' });
});

app.get('/api/debug-db', async (req, res) => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    let errorMsg = null;
    if (mongoose.connection.readyState !== 1 && process.env.MONGO_URI) {
        try {
            await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        } catch (err) {
            errorMsg = err.message;
        }
    }
    res.json({
        readyState: states[mongoose.connection.readyState],
        dbName: mongoose.connection.name,
        uriConfigured: !!process.env.MONGO_URI,
        error: errorMsg
    });
});

app.get('/api/debug-users', async (req, res) => {
    try {
        const users = await User.find().select('username phone role');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
