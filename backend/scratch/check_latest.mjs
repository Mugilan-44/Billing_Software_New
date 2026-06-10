import 'dotenv/config';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/billing_system');
    console.log('Connected to DB');

    // Get the latest 3 invoices
    const recentInvoices = await Invoice.find().sort({ createdAt: -1 }).limit(3).lean();
    for (const inv of recentInvoices) {
        console.log(`\n--- Invoice: ${inv.invoiceNumber} ---`);
        console.log(`  amountPaid: ${inv.amountPaid}`);
        console.log(`  balanceDue: ${inv.balanceDue}`);
        console.log(`  grandTotal: ${inv.grandTotal}`);
        console.log(`  status: ${inv.status}`);
        console.log(`  companyId: ${inv.companyId}`);
        console.log(`  branchId: ${inv.branchId}`);

        // Check for payments linked to this invoice
        const payments = await Payment.find({ invoiceId: inv._id }).lean();
        console.log(`  Payments linked: ${payments.length}`);
        for (const p of payments) {
            console.log(`    Payment ${p.paymentNumber}: amount=${p.amount}, companyId=${p.companyId}, branchId=${p.branchId}`);
        }
    }

    // Also check total payments
    const allPayments = await Payment.find().sort({ createdAt: -1 }).limit(5).lean();
    console.log('\n\n--- Latest 5 Payments in DB ---');
    for (const p of allPayments) {
        console.log(`  ${p.paymentNumber}: amount=${p.amount}, invoiceId=${p.invoiceId}, companyId=${p.companyId}, branchId=${p.branchId}, createdAt=${p.createdAt}`);
    }

    await mongoose.connection.close();
}

run().catch(console.error);
