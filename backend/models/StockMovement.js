const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },

    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: [true, "Inventory is required"],
    },

    movementType: {
      type: String,
      enum: ["opening", "purchase", "sale", "service", "adjustment", "return"],
      required: [true, "Movement type is required"],
    },

    direction: {
      type: String,
      enum: ["in", "out"],
      required: [true, "Movement direction is required"],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.01, "Quantity must be greater than zero"],
    },

    beforeStock: {
      type: Number,
      required: true,
      min: 0,
    },

    afterStock: {
      type: Number,
      required: true,
      min: 0,
    },

    referenceType: {
      type: String,
      enum: [
        "opening",
        "purchase",
        "vehicleSale",
        "jobCard",
        "manual",
        "return",
      ],
      default: "manual",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    sourceKey: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
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
    collection: "stock_movements",
    versionKey: false,
  },
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ movementType: 1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });

module.exports = mongoose.model("stockMovement", stockMovementSchema);
