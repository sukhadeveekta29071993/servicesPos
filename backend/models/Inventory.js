const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: [true, "Product is required"],
      unique: true,
    },

    currentStock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },

    reservedStock: {
      type: Number,
      default: 0,
      min: [0, "Reserved stock cannot be negative"],
    },

    availableStock: {
      type: Number,
      default: 0,
      min: [0, "Available stock cannot be negative"],
    },

    lastStockMovement: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
    collection: "inventory",
    versionKey: false,
  },
);

inventorySchema.index({ status: 1 });

module.exports = mongoose.model("inventory", inventorySchema);
