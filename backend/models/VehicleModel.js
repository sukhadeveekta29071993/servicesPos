const mongoose = require("mongoose");

const vehicleModelSchema = new mongoose.Schema(
  {
    modelCode: {
      type: String,
      required: [true, "Vehicle model code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    company: {
      type: String,
      required: [true, "Vehicle company is required"],
      trim: true,
    },

    modelName: {
      type: String,
      required: [true, "Vehicle model name is required"],
      trim: true,
    },

    variant: {
      type: String,
      default: "",
      trim: true,
    },

    vehicleType: {
      type: String,
      enum: [
        "scooter",
        "motorcycle",
        "electric_scooter",
        "electric_motorcycle",
        "other",
      ],
      required: [true, "Vehicle type is required"],
    },

    fuelType: {
      type: String,
      enum: ["petrol", "electric", "cng", "other"],
      required: [true, "Fuel type is required"],
      lowercase: true,
      trim: true,
    },

    engineCapacityCC: {
      type: Number,
      default: 0,
      min: [0, "Engine capacity cannot be negative"],
    },

    batteryCapacityKWh: {
      type: Number,
      default: 0,
      min: [0, "Battery capacity cannot be negative"],
    },

    transmission: {
      type: String,
      enum: ["manual", "automatic", "cvt", "other"],
      default: "other",
      lowercase: true,
    },

    exShowroomPrice: {
      type: Number,
      required: [true, "Ex-showroom price is required"],
      min: [0, "Price cannot be negative"],
    },

    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      required: [true, "GST rate is required"],
      default: 18,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
    collection: "vehiclemodels",
    versionKey: false,
  },
);

vehicleModelSchema.index({
  company: 1,
  modelName: 1,
});

vehicleModelSchema.index({ status: 1 });

module.exports = mongoose.model("vehicleModel", vehicleModelSchema);
