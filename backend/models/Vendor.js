const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    vendorCode: {
      type: String,
      required: [true, "Vendor code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },

    companyName: {
      type: String,
      default: "",
      trim: true,
    },

    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
    },

    alternateMobile: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    gstin: {
      type: String,
      default: "",
      uppercase: true,
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    pincode: {
      type: String,
      default: "",
      trim: true,
    },

    paymentTerms: {
      type: String,
      enum: ["cash", "immediate", "credit"],
      default: "cash",
      lowercase: true,
      trim: true,
    },

    creditDays: {
      type: Number,
      default: 0,
      min: [0, "Credit days cannot be negative"],
    },

    creditLimit: {
      type: Number,
      default: 0,
      min: [0, "Credit limit cannot be negative"],
    },

    openingBalance: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "vendors",
    versionKey: false,
  },
);

vendorSchema.index({ name: 1 });
vendorSchema.index({ mobile: 1 });
vendorSchema.index({ status: 1 });

module.exports = mongoose.model("vendors", vendorSchema);
