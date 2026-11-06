const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
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

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
  },
  { _id: true },
);

const vehicleSaleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer is required"],
    },

    vehicleModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleModel",
      required: [true, "Vehicle model is required"],
    },

    vehicleUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleUnit",
      required: [true, "Vehicle unit is required"],
    },

    registrationNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },

    saleDate: {
      type: Date,
      default: Date.now,
    },

    exShowroomPrice: {
      type: Number,
      required: [true, "Ex-showroom price is required"],
      min: [0, "Price cannot be negative"],
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: [0, "Taxable amount cannot be negative"],
    },

    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      required: true,
    },

    gstAmount: {
      type: Number,
      required: true,
      min: [0, "GST cannot be negative"],
    },

    grandTotal: {
      type: Number,
      required: true,
      min: [0, "Grand total cannot be negative"],
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
    },

    balanceAmount: {
      type: Number,
      required: true,
      min: [0, "Balance cannot be negative"],
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },

    payments: {
      type: [paymentSchema],
      default: [],
    },

    saleStatus: {
      type: String,
      enum: ["draft", "completed", "cancelled"],
      default: "draft",
    },

    deliveryStatus: {
      type: String,
      enum: ["pending", "delivered"],
      default: "pending",
    },

    deliveryDate: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
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
    collection: "vehiclesales",
    versionKey: false,
  },
);

vehicleSaleSchema.index({ customer: 1, saleDate: -1 });
vehicleSaleSchema.index({ saleStatus: 1 });
vehicleSaleSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("vehicleSale", vehicleSaleSchema);
