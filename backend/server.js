const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
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
        } catch (seedErr) {
            console.error('Error seeding admin account:', seedErr.message);
        }
    })
    .catch(err => {
        console.error('Database connection error:', err.message);
    });

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/clans', require('./routes/clans'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/host', require('./routes/host'));

// Root endpoint
app.get('/', (req, res) => {
    res.json({ msg: 'Welcome to the FragArena API' });
});

app.get('/api/debug-db', (req, res) => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    res.json({
        readyState: states[mongoose.connection.readyState],
        dbName: mongoose.connection.name,
        uriConfigured: !!process.env.MONGO_URI
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
