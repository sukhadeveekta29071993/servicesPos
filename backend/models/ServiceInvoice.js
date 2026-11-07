const mongoose = require("mongoose");

const serviceInvoiceItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ["part", "labour", "other"],
      required: [true, "Item type is required"],
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      default: null,
    },

    serviceTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "serviceTask",
      default: null,
    },

    description: {
      type: String,
      trim: true,
      required: [true, "Item description is required"],
    },

    quantity: {
      type: Number,
      required: true,
      min: [0.01, "Quantity must be greater than zero"],
    },

    unitPrice: {
      type: Number,
      required: true,
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
      min: 0,
      max: 100,
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  },
);

const serviceInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    jobCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "jobCard",
      required: [true, "Job card is required"],
      unique: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customer",
      required: [true, "Customer is required"],
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vehicle",
      required: [true, "Vehicle is required"],
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    items: {
      type: [serviceInvoiceItemSchema],
      required: [true, "Invoice items are required"],
      validate: {
        validator: function (items) {
          return items.length > 0;
        },
        message: "Invoice must contain at least one item",
      },
    },

    partsAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    labourAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxableAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balanceAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partially_paid", "paid"],
      default: "unpaid",
    },

    invoiceStatus: {
      type: String,
      enum: ["draft", "issued", "cancelled"],
      default: "draft",
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
    collection: "service_invoices",
    versionKey: false,
  },
);

serviceInvoiceSchema.index({ customer: 1, invoiceDate: -1 });
serviceInvoiceSchema.index({ paymentStatus: 1 });
serviceInvoiceSchema.index({ invoiceStatus: 1 });

module.exports = mongoose.model("serviceInvoice", serviceInvoiceSchema);
