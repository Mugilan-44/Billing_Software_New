import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  sku:  { type: String, unique: true, sparse: true, trim: true },
  type: {
    type: String,
    enum: ['Goods', 'Service'],
    default: 'Goods',
  },
  category: {
    type: String,
    trim: true,
  },

  // Canonical fields (new code)
  availableStock: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  trackStock: {
    type: Boolean,
    default: true
  },

  // Legacy fields (backward compat)
  stockQuantity: { type: Number, default: 0 },
  lowStockAlert: { type: Number, default: 5 },


  sellingPrice: {
    type: Number,
    required: true,
  },
  purchasePrice: {
    type: Number,
    default: 0,
  },
  barcode: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  unit: { type: String, default: 'pcs' },
}, { timestamps: true });

itemSchema.index({ availableStock: 1 });

// Pre-save hook to keep canonical and legacy fields in sync
// NOTE: Mongoose v9+ requires async pre-hooks — next() callback is no longer supported
itemSchema.pre('save', async function () {
  // Sync availableStock <-> stockQuantity
  if (this.isModified('availableStock')) {
    this.stockQuantity = this.availableStock;
  } else if (this.isModified('stockQuantity')) {
    this.availableStock = this.stockQuantity;
  }


});

const Item = mongoose.model('Item', itemSchema);
export default Item;
