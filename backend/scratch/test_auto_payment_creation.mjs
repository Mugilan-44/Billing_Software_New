import 'dotenv/config';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';
import LedgerEntry from '../models/LedgerEntry.js';
import CompanySettings from '../models/CompanySettings.js';
import { createInvoice } from '../controllers/invoiceController.js';

async function runTest() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/billing_system');
    console.log('Connected to DB');

    // Create a mock user
    const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        role: 'ADMIN',
        companyId: new mongoose.Types.ObjectId('6a19141cfc7fbb9f87b115a4'),
        branchId: new mongoose.Types.ObjectId('6a19141cfc7fbb9f87b115a6'),
    };

    // Find or create customer
    let customer = await Customer.findOne({ companyId: mockUser.companyId });
    if (!customer) {
        customer = new Customer({
            name: 'Test Customer Auto Payment',
            companyName: 'Test Company Auto Payment',
            email: 'test@autopay.com',
            companyId: mockUser.companyId,
            branchId: mockUser.branchId,
            outstandingBalance: 0,
        });
        await customer.save();
    }
    console.log(`Using Customer: ID=${customer._id}, CompanyId=${customer.companyId}`);

    // Create mock req and res
    const req = {
        user: mockUser,
        body: {
            customerId: customer._id.toString(),
            date: new Date(),
            dueDate: new Date(),
            lineItems: [
                {
                    name: 'Test Item',
                    quantity: 2,
                    rate: 250,
                    gstPercent: 18,
                }
            ],
            amountPaid: 150,
            status: 'Sent',
            taxMode: 'WITH_TAX',
        }
    };

    const res = {
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.data = data;
            return this;
        }
    };

    console.log('Calling createInvoice...');
    await createInvoice(req, res);

    if (res.statusCode === 201 && res.data && res.data.success) {
        const invoice = res.data.data;
        console.log(`Invoice created successfully! ID=${invoice._id}, InvoiceNumber=${invoice.invoiceNumber}, Status=${invoice.status}`);

        // Query the database for the created payment
        const payment = await Payment.findOne({ invoiceId: invoice._id }).lean();
        if (payment) {
            console.log('--- TEST PASSED: Payment was created! ---');
            console.log('Payment Details:', {
                _id: payment._id,
                paymentNumber: payment.paymentNumber,
                amount: payment.amount,
                companyId: payment.companyId,
                branchId: payment.branchId,
                notes: payment.notes
            });

            // Verify companyId and branchId match the mock user/customer
            if (payment.companyId.toString() === mockUser.companyId.toString() &&
                payment.branchId.toString() === mockUser.branchId.toString()) {
                console.log('--- VERIFICATION SUCCESS: companyId and branchId are correctly set on Payment! ---');
            } else {
                console.error('--- VERIFICATION FAILED: companyId or branchId mismatch on Payment! ---');
            }

            // Verify ledger entries
            const ledgerEntries = await LedgerEntry.find({ referenceId: payment._id }).lean();
            console.log(`Found ${ledgerEntries.length} Ledger Entries for payment:`);
            ledgerEntries.forEach(entry => {
                console.log(`  LedgerEntry: ID=${entry._id}, Type=${entry.type}, Credit=${entry.credit}, Debit=${entry.debit}, CompanyId=${entry.companyId}, BranchId=${entry.branchId}`);
            });
        } else {
            console.error('--- TEST FAILED: No payment document found for the created invoice! ---');
        }
    } else {
        console.error('Failed to create invoice:', res.statusCode, res.data);
    }

    await mongoose.connection.close();
}

runTest().catch(console.error);
