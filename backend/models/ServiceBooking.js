const mongoose = require("mongoose");

const serviceBookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: [true, "Booking number is required"],
      unique: true,
      uppercase: true,
      trim: true,
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
      required: [true, "Customer vehicle is required"],
      index: true,
    },

    bookingDate: {
      type: Date,
      default: Date.now,
    },

    scheduledDate: {
      type: Date,
      required: [true, "Scheduled service date is required"],
    },

    preferredTimeSlot: {
      type: String,
      enum: ["morning", "afternoon", "evening", "anytime"],
      default: "anytime",
    },

    serviceType: {
      type: String,
      enum: [
        "general",
        "periodic",
        "repair",
        "accidental",
        "inspection",
        "other",
      ],
      required: [true, "Service type is required"],
    },

    odometerReading: {
      type: Number,
      required: [true, "Odometer reading is required"],
      min: [0, "Odometer reading cannot be negative"],
    },

    customerComplaint: {
      type: String,
      required: [true, "Customer complaint is required"],
      trim: true,
      maxlength: 1000,
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    bookingStatus: {
      type: String,
      enum: ["booked", "checked_in", "cancelled"],
      default: "booked",
      index: true,
    },

    cancellationReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Created by user is required"],
    },
  },
  {
    timestamps: true,
    collection: "servicebookings",
    versionKey: false,
  },
);

// Indexes

serviceBookingSchema.index({ customer: 1, bookingDate: -1 });
serviceBookingSchema.index({ vehicle: 1, scheduledDate: -1 });
serviceBookingSchema.index({ bookingStatus: 1, scheduledDate: 1 });

module.exports = mongoose.model("serviceBooking", serviceBookingSchema);
