import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = (await import('./models/User.js')).default;
    const admin = await User.findOne({ role: 'SUPER_ADMIN' });
    const token = require('jsonwebtoken').sign({ id: admin._id, role: 'SUPER_ADMIN' }, process.env.JWT_SECRET);
    
    try {
        const payload = {
            customerId: "664c39c8e8749e794dc2a92c", // Replace with valid or dummy
            invoiceNumber: "INV-TEST-001",
            taxMode: 'WITH_TAX',
            date: new Date(),
            status: 'Draft',
            lineItems: [{ name: 'Test', quantity: 1, rate: 500, amount: 500 }],
            amountPaid: 150,
            balanceDue: 350,
            subTotal: 500,
            grandTotal: 500,
            taxType: 'None',
            isTaxed: false,
        };

        const res = await axios.post('http://localhost:3000/api/invoices', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Success!', res.data.data.invoiceNumber);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
    process.exit(0);
}
run();
