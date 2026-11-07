const mongoose = require("mongoose");

const supplierPaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: [true, "Payment number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendors",
      required: [true, "Vendor is required"],
    },

    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "purchase",
      default: null,
    },

    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0.01, "Payment amount must be greater than zero"],
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "bank_transfer", "cheque", "other"],
      required: [true, "Payment method is required"],
    },

    transactionReference: {
      type: String,
      trim: true,
      default: "",
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "completed",
    },

    paymentType: {
      type: String,
      enum: ["purchase", "advance"],
      default: "purchase",
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
    collection: "supplier_payments",
    versionKey: false,
  },
);

supplierPaymentSchema.index({ vendor: 1, paymentDate: -1 });
supplierPaymentSchema.index({ purchase: 1 });
supplierPaymentSchema.index({ paymentStatus: 1 });
supplierPaymentSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model("supplierPayment", supplierPaymentSchema);
