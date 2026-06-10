import 'dotenv/config';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/billing_system');
    console.log('Connected to DB');

    const payments = await Payment.find().lean();
    console.log(`Total payments in DB: ${payments.length}`);
    payments.forEach(p => {
        console.log(`ID: ${p._id}, Company: ${p.companyId}, Number: ${p.paymentNumber}, Invoice: ${p.invoiceId}, Amount: ${p.amount}, Date: ${p.date}, Notes: "${p.notes}"`);
    });

    await mongoose.connection.close();
}

run().catch(console.error);
