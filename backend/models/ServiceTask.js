const mongoose = require("mongoose");

const serviceTaskSchema = new mongoose.Schema(
  {
    jobCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobCard",
      required: [true, "Job card is required"],
      index: true,
    },

    taskCode: {
      type: String,
      required: [true, "Task code is required"],
      uppercase: true,
      trim: true,
    },

    taskName: {
      type: String,
      required: [true, "Task name is required"],
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    taskType: {
      type: String,
      enum: ["labour", "inspection", "repair", "maintenance", "other"],
      default: "labour",
    },

    assignedMechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },

    estimatedHours: {
      type: Number,
      default: 0,
      min: [0, "Estimated hours cannot be negative"],
    },

    actualHours: {
      type: Number,
      default: 0,
      min: [0, "Actual hours cannot be negative"],
    },

    labourCharge: {
      type: Number,
      default: 0,
      min: [0, "Labour charge cannot be negative"],
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    gstRate: {
      type: Number,
      enum: [0, 5, 12, 18, 28],
      default: 18,
    },

    taskStatus: {
      type: String,
      enum: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "on_hold",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    remarks: {
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
    collection: "servicetasks",
    versionKey: false,
  },
);

// Indexes
serviceTaskSchema.index({ jobCard: 1, taskStatus: 1 });
serviceTaskSchema.index({ assignedMechanic: 1, taskStatus: 1 });
serviceTaskSchema.index({ jobCard: 1, taskCode: 1 }, { unique: true });

module.exports = mongoose.model("serviceTask", serviceTaskSchema);
