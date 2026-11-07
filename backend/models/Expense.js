const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: [true, "Expense number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    expenseTitle: {
      type: String,
      required: [true, "Expense title is required"],
      trim: true,
    },

    category: {
      type: String,
      required: [true, "Expense category is required"],
      enum: [
        "rent",
        "electricity",
        "water",
        "salary",
        "maintenance",
        "fuel",
        "transport",
        "office_supplies",
        "marketing",
        "tools",
        "equipment",
        "other",
      ],
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vendor",
      default: null,
    },

    expenseDate: {
      type: Date,
      required: [true, "Expense date is required"],
      default: Date.now,
    },

    amount: {
      type: Number,
      required: [true, "Expense amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 0,
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

    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "bank_transfer", "cheque"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "partially_paid"],
      default: "paid",
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    receiptUrl: {
      type: String,
      trim: true,
      default: "",
    },

    expenseStatus: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "expenses",
  },
);

expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ paymentStatus: 1 });
expenseSchema.index({ expenseStatus: 1 });
expenseSchema.index({ vendor: 1 });

module.exports = mongoose.model("expense", expenseSchema);
