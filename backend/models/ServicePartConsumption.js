const mongoose = require("mongoose");

const servicePartConsumptionSchema = new mongoose.Schema(
  {
    jobCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "jobCard",
      required: [true, "Job card is required"],
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: [true, "Product is required"],
    },

    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "inventory",
      required: [true, "Inventory is required"],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.01, "Quantity must be greater than zero"],
    },

    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
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
      min: [0, "GST rate cannot be negative"],
      max: [100, "GST rate cannot exceed 100"],
    },

    taxableAmount: {
      type: Number,
      required: [true, "Taxable amount is required"],
      min: 0,
    },

    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: 0,
    },

    stockMovement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "stockMovement",
      required: [true, "Stock movement is required"],
      unique: true,
    },

    consumptionDate: {
      type: Date,
      default: Date.now,
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
    collection: "service_part_consumptions",
    versionKey: false,
  },
);

servicePartConsumptionSchema.index({ jobCard: 1, createdAt: -1 });
servicePartConsumptionSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model(
  "servicePartConsumption",
  servicePartConsumptionSchema,
);
