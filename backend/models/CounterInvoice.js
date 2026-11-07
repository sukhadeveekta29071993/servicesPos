const mongoose = require("mongoose");

const counterInvoiceItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: [true, "Product is required"],
    },

    description: {
      type: String,
      trim: true,
      required: [true, "Product description is required"],
    },

    quantity: {
      type: Number,
      required: true,
      min: [0.01, "Quantity must be greater than zero"],
    },

    unitPrice: {
      type: Number,
      required: true,
      min: [0, "Unit price cannot be negative"],
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    gstRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true },
);

const counterInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    items: {
      type: [counterInvoiceItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message: "Invoice must contain at least one item",
      },
    },

    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "paid"],
      default: "unpaid",
    },

    invoiceStatus: {
      type: String,
      enum: ["draft", "issued", "cancelled"],
      default: "draft",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
    collection: "counter_invoices",
    versionKey: false,
  },
);

counterInvoiceSchema.index({ customer: 1, invoiceDate: -1 });
counterInvoiceSchema.index({ paymentStatus: 1 });
counterInvoiceSchema.index({ invoiceStatus: 1 });

module.exports = mongoose.model("counterInvoice", counterInvoiceSchema);
