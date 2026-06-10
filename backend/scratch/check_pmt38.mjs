import 'dotenv/config';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/billing_system');
    console.log('Connected to DB');

    const payment = await Payment.findOne({ paymentNumber: 'PMT-000038' }).lean();
    console.log('Payment details:', payment);

    await mongoose.connection.close();
}

run().catch(console.error);
