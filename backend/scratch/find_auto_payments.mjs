import 'dotenv/config';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/billing_system');
    console.log('Connected to DB');

    const payments = await Payment.find({
        $or: [
            { notes: /Auto-generated/i },
            { reference: /Advance payment/i }
        ]
    }).lean();
    console.log('Found Auto-generated/Advance payments:', payments.length);
    payments.forEach(p => {
        console.log(`ID: ${p._id}, Company: ${p.companyId}, Branch: ${p.branchId}, Number: ${p.paymentNumber}, Invoice: ${p.invoiceId}, Amount: ${p.amount}, Date: ${p.date}, Mode: ${p.mode || p.paymentMode}`);
    });

    await mongoose.connection.close();
}

run().catch(console.error);
