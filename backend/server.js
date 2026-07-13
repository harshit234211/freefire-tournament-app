const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/host', require('./routes/host'));
app.use('/api/admin', require('./routes/admin'));

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/khiladibattle';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected successfully!');
        // Seed initial data
        seedDatabase();
        
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

// Seeding Initial Data
async function seedDatabase() {
    try {
        const User = require('./models/User');
        const Tournament = require('./models/Tournament');
        const Announcement = require('./models/Announcement');

        // 1. Seed Default Admin User
        let adminUser = await User.findOne({ phone: '7017022966' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('harshit9090@@()', salt);

        if (!adminUser) {
            console.log('No admin user found. Seeding default admin account...');
            adminUser = new User({
                username: 'admin',
                phone: '7017022966',
                password: hashedPassword,
                role: 'admin',
                ffName: '亗 ADMIN 亗',
                ffUid: '1111111111',
                coins: 500,
                winnings: 200
            });
            await adminUser.save();
            console.log('Default Admin Account Created! (Phone: 7017022966, Password: harshit9090@@())');
        } else {
            // Update existing user to admin role and set requested password
            adminUser.role = 'admin';
            adminUser.password = hashedPassword;
            await adminUser.save();
            console.log('Admin Account verified and updated! (Phone: 7017022966, Password: harshit9090@@())');
        }

        // 2. Remove all existing Hosts from database (demote to players)
        const demotedHosts = await User.updateMany({ role: 'host' }, { role: 'player' });
        if (demotedHosts.modifiedCount > 0) {
            console.log(`Database Migration: Demoted ${demotedHosts.modifiedCount} host accounts back to players.`);
        }

        // 3. Seed Default Player User
        const playerExists = await User.findOne({ phone: '7777777777' });
        if (!playerExists) {
            console.log('No player user found. Seeding default player account...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('playerpassword', salt);
            
            const defaultPlayer = new User({
                username: 'Viper_FF',
                phone: '7777777777',
                password: hashedPassword,
                role: 'player',
                ffName: '亗 VIPER 亗',
                ffUid: '7777777777',
                coins: 200,
                winnings: 75
            });
            await defaultPlayer.save();
            console.log('Default Player Account Created! (Phone: 7777777777, Password: playerpassword)');
        }

        // 4. Seed Default Matches
        const matchesCount = await Tournament.countDocuments();
        if (matchesCount === 0) {
            console.log('No matches found. Seeding sample tournaments...');
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];

            const host = await User.findOne({ role: 'host' });

            const sampleMatches = [
                {
                    title: "Free Fire Clash Squad Duel #45",
                    map: "Bermuda",
                    mode: "Clash Squad",
                    prizePool: 400,
                    perKill: 10,
                    entryFee: 15,
                    totalSlots: 8,
                    date: dateStr,
                    time: "18:30",
                    status: "upcoming",
                    assignedHost: host ? host._id : null,
                    joinedPlayers: []
                },
                {
                    title: "Bermuda Survival Per-Kill BR",
                    map: "Bermuda",
                    mode: "Battle Royale",
                    prizePool: 1200,
                    perKill: 5,
                    entryFee: 20,
                    totalSlots: 48,
                    date: dateStr,
                    time: "20:00",
                    status: "upcoming",
                    assignedHost: host ? host._id : null,
                    joinedPlayers: []
                }
            ];

            await Tournament.insertMany(sampleMatches);
            console.log('Sample tournaments seeded successfully.');
        }

        // 5. Seed Announcements
        const announceCount = await Announcement.countDocuments();
        if (announceCount === 0) {
            const firstAnnounce = new Announcement({
                title: "Welcome to Khiladi Battle!",
                content: "Direct phone registration is now active. Join Battle Royale and Clash Squad rooms, deposit via Cashfree, and start earning!",
                type: "general"
            });
            await firstAnnounce.save();
        }
    } catch (err) {
        console.error('Error seeding database:', err);
    }
}
