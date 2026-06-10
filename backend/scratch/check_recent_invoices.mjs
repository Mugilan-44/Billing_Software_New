import 'dotenv/config';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/billing_system');
    console.log('Connected to DB');

    const invoices = await Invoice.find().sort({ createdAt: -1 }).limit(10).lean();
    console.log('Recent 10 Invoices:');
    for (const inv of invoices) {
        const linkedPayments = await Payment.find({ invoiceId: inv._id }).lean();
        console.log(`Invoice ${inv.invoiceNumber}: GrandTotal=${inv.grandTotal}, AmountPaid=${inv.amountPaid}, BalanceDue=${inv.balanceDue}, Status=${inv.status}, CreatedAt=${inv.createdAt}`);
        console.log(`  Linked Payments count: ${linkedPayments.length}`);
        linkedPayments.forEach(p => {
            console.log(`    Payment ${p.paymentNumber}: Amount=${p.amount}, Notes="${p.notes}"`);
        });
    }

    await mongoose.connection.close();
}

run().catch(console.error);
