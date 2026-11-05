const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password_hash: {
      type: String,
      required: true,
      select: false,
    },

    phone: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["customer", "admin", "salesperson"],
      default: "customer",
    },

    customer_type: {
      type: String,
      enum: ["retail", "wholesale"],
      default: "retail",
    },

    approved: {
      type: Boolean,
      default: true,
    },

    business_name: {
      type: String,
      default: "",
    },

    gstin: {
      type: String,
      default: "",
    },

    salesperson_id: {
      type: String,
      default: "",
    },

    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "users",
    versionKey: false,
  },
);

module.exports = mongoose.model("users", userSchema);
