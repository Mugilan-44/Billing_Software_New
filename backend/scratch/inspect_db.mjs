import 'dotenv/config';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/billing_system');
    console.log('Connected to DB');

    const totalInvoices = await Invoice.countDocuments();
    const totalPayments = await Payment.countDocuments();
    console.log(`Total Invoices: ${totalInvoices}`);
    console.log(`Total Payments: ${totalPayments}`);

    const payments = await Payment.find().sort({ createdAt: -1 }).limit(10).lean();
    console.log('Recent 10 Payments:', payments);

    const invoicesWithPayment = await Invoice.find({ amountPaid: { $gt: 0 } }).limit(5).lean();
    console.log('Invoices with amountPaid > 0:', invoicesWithPayment);

    await mongoose.connection.close();
}

run().catch(console.error);
