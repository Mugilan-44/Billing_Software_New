import mongoose from 'mongoose';

const purchasePaymentSchema = new mongoose.Schema({
  companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  branchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },

  paymentNumber: {
    type: String,
    required: true,
  },
  purchaseBillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseBill',
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  mode: {
    type: String,
    enum: ['Cash', 'Bank', 'UPI', 'Cheque', 'Credit', 'NEFT', 'RTGS', 'Card', 'Bank Transfer', 'Bank Transfer (NEFT/RTGS)', 'UPI / QR', 'UPI/QR'],
  },
  reference: {
    type: String,
  },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

purchasePaymentSchema.pre('validate', function() {
  const normalize = (val) => {
    if (!val) return val;
    if (val === 'Bank Transfer' || val === 'Bank Transfer (NEFT/RTGS)') return 'Bank';
    if (val === 'UPI / QR' || val === 'UPI/QR') return 'UPI';
    return val;
  };
  if (this.mode) this.mode = normalize(this.mode);
});

purchasePaymentSchema.index({ purchaseBillId: 1 });
purchasePaymentSchema.index({ vendorId: 1 });
purchasePaymentSchema.index({ purchaseBillId: 1, companyId: 1 });
purchasePaymentSchema.index({ companyId: 1, date: -1 });
purchasePaymentSchema.index({ companyId: 1, paymentNumber: 1 }, { unique: true });

const PurchasePayment = mongoose.model('PurchasePayment', purchasePaymentSchema);
export default PurchasePayment;
