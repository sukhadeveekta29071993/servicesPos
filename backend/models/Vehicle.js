const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customer",
      required: [true, "Customer is required"],
      index: true,
    },

    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    company: {
      type: String,
      required: [true, "Vehicle company is required"],
      trim: true,
    },

    model: {
      type: String,
      required: [true, "Vehicle model is required"],
      trim: true,
    },

    variant: {
      type: String,
      default: "",
      trim: true,
    },

    fuelType: {
      type: String,
      enum: ["petrol", "electric", "cng", "other"],
      default: "petrol",
      lowercase: true,
      trim: true,
    },

    chassisNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: undefined,
    },

    engineNumber: {
      type: String,
      uppercase: true,
      trim: true,
      default: undefined,
    },

    color: {
      type: String,
      default: "",
      trim: true,
    },

    purchaseDate: {
      type: Date,
      default: null,
    },

    currentKM: {
      type: Number,
      default: 0,
      min: [0, "Kilometers cannot be negative"],
    },

    insuranceExpiry: {
      type: Date,
      default: null,
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
    collection: "vehicles",
    versionKey: false,
  },
);

// Unique vehicle identification indexes

vehicleSchema.index({ chassisNumber: 1 }, { unique: true, sparse: true });

vehicleSchema.index({ engineNumber: 1 }, { unique: true, sparse: true });

vehicleSchema.index({ customer: 1, status: 1 });

module.exports = mongoose.model("Vehicle", vehicleSchema);
