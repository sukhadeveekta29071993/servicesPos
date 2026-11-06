const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, "Product SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    category: {
      type: String,
      required: [true, "Product category is required"],
      trim: true,
    },

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    unit: {
      type: String,
      enum: ["piece", "set", "liter", "kg", "meter", "box", "other"],
      default: "piece",
      lowercase: true,
      trim: true,
    },

    hsnCode: {
      type: String,
      default: "",
      trim: true,
    },

    purchasePrice: {
      type: Number,
      required: [true, "Purchase price is required"],
      min: [0, "Purchase price cannot be negative"],
    },

    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price cannot be negative"],
    },

    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 18,
    },

    openingStock: {
      type: Number,
      default: 0,
      min: [0, "Opening stock cannot be negative"],
    },

    reorderLevel: {
      type: Number,
      default: 5,
      min: [0, "Reorder level cannot be negative"],
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
    collection: "products",
    versionKey: false,
  },
);

module.exports = mongoose.model("product", productSchema);
