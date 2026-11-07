const mongoose = require("mongoose");

const jobCardSchema = new mongoose.Schema(
  {
    jobCardNumber: {
      type: String,
      required: [true, "Job card number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    serviceBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "serviceBooking",
      required: [true, "Service booking is required"],
      unique: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customer",
      required: [true, "Customer is required"],
      index: true,
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vehicle",
      required: [true, "Vehicle is required"],
      index: true,
    },

    mechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },

    checkInDate: {
      type: Date,
      default: Date.now,
    },

    estimatedDeliveryDate: {
      type: Date,
      default: null,
    },

    actualDeliveryDate: {
      type: Date,
      default: null,
    },

    odometerReading: {
      type: Number,
      required: [true, "Odometer reading is required"],
      min: [0, "Odometer reading cannot be negative"],
    },

    fuelLevel: {
      type: String,
      enum: ["empty", "quarter", "half", "three_quarters", "full", "unknown"],
      default: "unknown",
    },

    vehicleCondition: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    customerComplaint: {
      type: String,
      required: [true, "Customer complaint is required"],
      trim: true,
      maxLength: 1000,
    },

    inspectionNotes: {
      type: String,
      default: "",
      trim: true,
      maxLength: 2000,
    },

    workDescription: {
      type: String,
      default: "",
      trim: true,
      maxLength: 2000,
    },

    estimatedCost: {
      type: Number,
      default: 0,
      min: [0, "Estimated cost cannot be negative"],
    },

    actualCost: {
      type: Number,
      default: 0,
      min: [0, "Actual cost cannot be negative"],
    },

    jobStatus: {
      type: String,
      enum: [
        "created",
        "inspection",
        "waiting_for_approval",
        "in_progress",
        "waiting_for_parts",
        "completed",
        "delivered",
        "cancelled",
      ],
      default: "created",
      index: true,
    },

    customerApproval: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    approvalDate: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxLength: 1000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
    collection: "jobcards",
    versionKey: false,
  },
);

// Indexes
jobCardSchema.index({ customer: 1, createdAt: -1 });
jobCardSchema.index({ vehicle: 1, createdAt: -1 });
jobCardSchema.index({ jobStatus: 1, createdAt: -1 });
jobCardSchema.index({ mechanic: 1, jobStatus: 1 });

module.exports = mongoose.model("jobCard", jobCardSchema);
