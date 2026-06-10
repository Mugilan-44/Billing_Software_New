import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import { calculateInvoice } from './utils/calculateInvoice.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Invoice = (await import('./models/Invoice.js')).default;
  const Payment = (await import('./models/Payment.js')).default;
  const LedgerEntry = (await import('./models/LedgerEntry.js')).default;
  const { getNextSequenceValue } = await import('./utils/counter.utils.js');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const amountPaid = 100;
    const totals = calculateInvoice({
      lineItems: [{ name: 'Test Item', quantity: 1, rate: 500 }], discountPercent: 0, discountFixed: 0,
      taxType: 'GST', taxRate: 0, isTaxed: false, useProductSpecificTax: false,
      tdsTcsType: 'None', tdsPercentage: 0, tcsPercentage: 0
    });

    const invoice = new Invoice({
      customerId: new mongoose.Types.ObjectId(),
      date: new Date(),
      lineItems: totals.lineItems,
      subtotal: totals.subtotal.toNumber(),
      grandTotal: totals.grandTotal.toNumber(),
      balanceDue: totals.grandTotal.toNumber() - amountPaid,
      amountPaid: amountPaid,
    });
    
    await invoice.save({ session });

    if (amountPaid > 0) {
      const paymentNumber = await getNextSequenceValue('payment', 'PMT', null);
      const payment = new Payment({
        paymentNumber,
        invoiceId: invoice._id,
        customerId: invoice.customerId,
        amount: amountPaid,
        date: invoice.date,
        mode: 'Cash',
      });
      await payment.save({ session });
    }

    await session.commitTransaction();
    console.log('Success! Payment created.', invoice.invoiceNumber);
  } catch (err) {
    console.error('Error in transaction:', err);
    await session.abortTransaction();
  } finally {
    session.endSession();
    process.exit(0);
  }
}
run();
