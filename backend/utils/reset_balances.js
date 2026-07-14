const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = 'mongodb+srv://shakyaharshit683_db_user:Battlegrounds%402026%21@cluster0.ieq46cq.mongodb.net/khiladibattle?retryWrites=true&w=majority';

async function resetBalances() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Database connected successfully');

        // Reset everyone to 0
        const resetRes = await User.updateMany({}, { $set: { coins: 0, winnings: 0 } });
        console.log(`Reset all users balance to 0. Matched: ${resetRes.matchedCount}, Modified: ${resetRes.modifiedCount}`);

        // Set Admin's coins to 15000
        const adminRes = await User.updateOne(
            { role: 'admin' },
            { $set: { coins: 15000 } }
        );
        console.log(`Updated admin balance to 15000. Matched: ${adminRes.matchedCount}, Modified: ${adminRes.modifiedCount}`);

        // Also check if admin phone matches 7017022966
        const adminPhoneRes = await User.updateOne(
            { phone: '7017022966' },
            { $set: { coins: 15000 } }
        );
        console.log(`Updated admin by phone 7017022966. Matched: ${adminPhoneRes.matchedCount}, Modified: ${adminPhoneRes.modifiedCount}`);

        console.log('Balance reset completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error occurred:', err);
        process.exit(1);
    }
}

resetBalances();
