const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: [true, "Payment number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    serviceInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "serviceInvoice",
      required: [true, "Service invoice is required"],
    },

    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0.01, "Payment amount must be greater than zero"],
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "bank_transfer", "cheque"],
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
      enum: ["pending", "completed", "failed", "refunded"],
      default: "completed",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Received by user is required"],
    },
  },
  {
    timestamps: true,
    collection: "payments",
    versionKey: false,
  },
);

paymentSchema.index({ serviceInvoice: 1, paymentDate: -1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model("payment", paymentSchema);
