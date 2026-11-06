const mongoose = require("mongoose");

const vehicleUnitSchema = new mongoose.Schema(
  {
    vehicleModel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleModel",
      required: [true, "Vehicle model is required"],
      index: true,
    },

    chassisNumber: {
      type: String,
      required: [true, "Chassis number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    engineNumber: {
      type: String,
      required: [true, "Engine number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    color: {
      type: String,
      required: [true, "Vehicle color is required"],
      trim: true,
    },

    manufacturingYear: {
      type: Number,
      required: [true, "Manufacturing year is required"],
      min: [1900, "Invalid manufacturing year"],
      max: [2100, "Invalid manufacturing year"],
    },

    purchaseDate: {
      type: Date,
      default: null,
    },

    purchasePrice: {
      type: Number,
      default: 0,
      min: [0, "Purchase price cannot be negative"],
    },

    stockStatus: {
      type: String,
      enum: ["available", "reserved", "sold", "damaged"],
      default: "available",
      index: true,
    },

    location: {
      type: String,
      default: "Showroom",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
    collection: "vehicleunits",
    versionKey: false,
  },
);

vehicleUnitSchema.index({ vehicleModel: 1, stockStatus: 1 });

module.exports = mongoose.model("vehicleUnit", vehicleUnitSchema);
