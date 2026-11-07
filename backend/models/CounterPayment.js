const mongoose = require("mongoose");

const counterPaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: [true, "Payment number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    counterInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "counterInvoice",
      required: [true, "Counter invoice is required"],
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
    collection: "counter_payments",
    versionKey: false,
  },
);

counterPaymentSchema.index({ counterInvoice: 1, paymentDate: -1 });
counterPaymentSchema.index({ paymentStatus: 1 });
counterPaymentSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model("counterPayment", counterPaymentSchema);
