const mongoose = require("mongoose");

const mechanicAssignmentSchema = new mongoose.Schema(
  {
    jobCard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobCard",
      required: [true, "Job card is required"],
      index: true,
    },

    serviceTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceTask",
      default: null,
    },

    mechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Mechanic is required"],
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "Assigned by user is required"],
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
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

    assignmentStatus: {
      type: String,
      enum: [
        "assigned",
        "accepted",
        "in_progress",
        "completed",
        "reassigned",
        "cancelled",
      ],
      default: "assigned",
      index: true,
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
    collection: "mechanicassignments",
    versionKey: false,
  },
);

// Indexes
mechanicAssignmentSchema.index({
  mechanic: 1,
  assignmentStatus: 1,
});

mechanicAssignmentSchema.index({
  jobCard: 1,
  assignmentStatus: 1,
});

mechanicAssignmentSchema.index({
  serviceTask: 1,
  mechanic: 1,
});

module.exports = mongoose.model("mechanicAssignment", mechanicAssignmentSchema);
