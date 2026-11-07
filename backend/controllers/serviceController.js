const mongoose = require("mongoose");

const ServiceBooking = require("../models/ServiceBooking");
const JobCard = require("../models/JobCard");
const ServiceTask = require("../models/ServiceTask");
const MechanicAssignment = require("../models/MechanicAssignment");

const Customer = require("../models/Customer");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");

// Generate unique document number
const generateNumber = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// Validate MongoDB ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ==========================================
// SERVICE BOOKING APIs
// ==========================================

// Create Service Booking
exports.createServiceBooking = async (req, res) => {
  try {
    const {
      customer,
      vehicle,
      scheduledDate,
      preferredTimeSlot,
      serviceType,
      odometerReading,
      customerComplaint,
      priority,
      notes,
    } = req.body;

    if (
      !customer ||
      !vehicle ||
      !scheduledDate ||
      !serviceType ||
      odometerReading === undefined ||
      !customerComplaint
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required booking details",
      });
    }

    if (!isValidId(customer) || !isValidId(vehicle)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer or vehicle ID",
      });
    }

    const customerExists = await Customer.findById(customer);

    if (!customerExists) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const vehicleExists = await Vehicle.findById(vehicle);

    if (!vehicleExists) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (vehicleExists.customer.toString() !== customer.toString()) {
      return res.status(400).json({
        success: false,
        message: "Vehicle does not belong to this customer",
      });
    }

    if (vehicleExists.status && vehicleExists.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Vehicle is not active",
      });
    }

    const reading = Number(odometerReading);

    if (!Number.isFinite(reading) || reading < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid odometer reading",
      });
    }

    if (reading < Number(vehicleExists.currentKM || 0)) {
      return res.status(400).json({
        success: false,
        message: "Odometer reading cannot be less than current vehicle KM",
      });
    }

    const booking = await ServiceBooking.create({
      bookingNumber: generateNumber("SB"),
      customer,
      vehicle,
      scheduledDate,
      preferredTimeSlot,
      serviceType,
      odometerReading: reading,
      customerComplaint,
      priority,
      notes,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Service booking created successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Service Bookings
exports.getAllServiceBookings = async (req, res) => {
  try {
    const bookings = await ServiceBooking.find()
      .populate("customer")
      .populate("vehicle")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Service Booking By ID
exports.getServiceBookingById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await ServiceBooking.findById(req.params.id)
      .populate("customer")
      .populate("vehicle")
      .populate("createdBy", "name email role");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Service booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Service Booking
exports.updateServiceBooking = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await ServiceBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Service booking not found",
      });
    }

    if (booking.bookingStatus !== "booked") {
      return res.status(400).json({
        success: false,
        message: "Only booked services can be updated",
      });
    }

    const allowedFields = [
      "scheduledDate",
      "preferredTimeSlot",
      "serviceType",
      "odometerReading",
      "customerComplaint",
      "priority",
      "notes",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        booking[field] = req.body[field];
      }
    });

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Service booking updated successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Cancel Service Booking
exports.cancelServiceBooking = async (req, res) => {
  try {
    const { cancellationReason } = req.body;

    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await ServiceBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Service booking not found",
      });
    }

    if (booking.bookingStatus !== "booked") {
      return res.status(400).json({
        success: false,
        message: "Only booked services can be cancelled",
      });
    }

    booking.bookingStatus = "cancelled";
    booking.cancellationReason = cancellationReason || "";

    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Service booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// JOB CARD APIs
// ==========================================

// Create Job Card from Service Booking
exports.createJobCard = async (req, res) => {
  try {
    const { serviceBooking } = req.body;

    if (!serviceBooking || !isValidId(serviceBooking)) {
      return res.status(400).json({
        success: false,
        message: "Valid service booking ID is required",
      });
    }

    const booking = await ServiceBooking.findById(serviceBooking);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Service booking not found",
      });
    }

    if (booking.bookingStatus !== "booked") {
      return res.status(400).json({
        success: false,
        message: "Only booked services can be checked in",
      });
    }

    const existingJobCard = await JobCard.findOne({
      serviceBooking,
    });

    if (existingJobCard) {
      return res.status(409).json({
        success: false,
        message: "Job card already exists for this booking",
        data: existingJobCard,
      });
    }

    const jobCard = await JobCard.create({
      jobCardNumber: generateNumber("JC"),
      serviceBooking: booking._id,
      customer: booking.customer,
      vehicle: booking.vehicle,
      odometerReading: booking.odometerReading,
      customerComplaint: booking.customerComplaint,
      estimatedDeliveryDate: req.body.estimatedDeliveryDate || null,
      fuelLevel: req.body.fuelLevel || "unknown",
      vehicleCondition: req.body.vehicleCondition || "",
      inspectionNotes: req.body.inspectionNotes || "",
      estimatedCost: req.body.estimatedCost || 0,
      notes: req.body.notes || "",
      createdBy: req.user._id,
    });

    booking.bookingStatus = "checked_in";
    await booking.save();

    return res.status(201).json({
      success: true,
      message: "Job card created successfully",
      data: jobCard,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Job Cards
exports.getAllJobCards = async (req, res) => {
  try {
    const jobCards = await JobCard.find()
      .populate("serviceBooking")
      .populate("customer")
      .populate("vehicle")
      .populate("mechanic", "name email role")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: jobCards.length,
      data: jobCards,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Job Card By ID
exports.getJobCardById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job card ID",
      });
    }

    const jobCard = await JobCard.findById(req.params.id)
      .populate("serviceBooking")
      .populate("customer")
      .populate("vehicle")
      .populate("mechanic", "name email role")
      .populate("createdBy", "name email role");

    if (!jobCard) {
      return res.status(404).json({
        success: false,
        message: "Job card not found",
      });
    }

    const tasks = await ServiceTask.find({
      jobCard: jobCard._id,
    }).populate("assignedMechanic", "name email role");

    return res.status(200).json({
      success: true,
      data: {
        jobCard,
        tasks,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Job Card
exports.updateJobCard = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job card ID",
      });
    }

    const jobCard = await JobCard.findById(req.params.id);

    if (!jobCard) {
      return res.status(404).json({
        success: false,
        message: "Job card not found",
      });
    }

    const allowedFields = [
      "estimatedDeliveryDate",
      "actualDeliveryDate",
      "fuelLevel",
      "vehicleCondition",
      "inspectionNotes",
      "workDescription",
      "estimatedCost",
      "actualCost",
      "jobStatus",
      "customerApproval",
      "approvalDate",
      "notes",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        jobCard[field] = req.body[field];
      }
    });

    await jobCard.save();

    return res.status(200).json({
      success: true,
      message: "Job card updated successfully",
      data: jobCard,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// SERVICE TASK APIs
// ==========================================

// Create Service Task
exports.createServiceTask = async (req, res) => {
  try {
    const {
      jobCard,
      taskCode,
      taskName,
      description,
      taskType,
      estimatedHours,
      labourCharge,
      discount,
      gstRate,
      remarks,
    } = req.body;

    if (!jobCard || !taskCode || !taskName) {
      return res.status(400).json({
        success: false,
        message: "Job card, task code and task name are required",
      });
    }

    if (!isValidId(jobCard)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job card ID",
      });
    }

    const jobCardExists = await JobCard.findById(jobCard);

    if (!jobCardExists) {
      return res.status(404).json({
        success: false,
        message: "Job card not found",
      });
    }

    if (
      ["completed", "delivered", "cancelled"].includes(jobCardExists.jobStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot add tasks to a closed job card",
      });
    }

    const task = await ServiceTask.create({
      jobCard,
      taskCode,
      taskName,
      description,
      taskType,
      estimatedHours,
      labourCharge,
      discount,
      gstRate,
      remarks,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Service task created successfully",
      data: task,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Service Tasks
exports.getAllServiceTasks = async (req, res) => {
  try {
    const filter = {};

    if (req.query.jobCard) {
      if (!isValidId(req.query.jobCard)) {
        return res.status(400).json({
          success: false,
          message: "Invalid job card ID",
        });
      }

      filter.jobCard = req.query.jobCard;
    }

    if (req.query.taskStatus) {
      filter.taskStatus = req.query.taskStatus;
    }

    const tasks = await ServiceTask.find(filter)
      .populate("jobCard")
      .populate("assignedMechanic", "name email role")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Service Task
exports.updateServiceTask = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await ServiceTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Service task not found",
      });
    }

    const allowedFields = [
      "taskName",
      "description",
      "taskType",
      "estimatedHours",
      "actualHours",
      "labourCharge",
      "discount",
      "gstRate",
      "taskStatus",
      "startedAt",
      "completedAt",
      "remarks",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    if (task.taskStatus === "completed" && !task.completedAt) {
      task.completedAt = new Date();
    }

    await task.save();

    return res.status(200).json({
      success: true,
      message: "Service task updated successfully",
      data: task,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete Service Task
exports.deleteServiceTask = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await ServiceTask.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Service task not found",
      });
    }

    await ServiceTask.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Service task deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// MECHANIC ASSIGNMENT APIs
// ==========================================

// Assign Mechanic
exports.assignMechanic = async (req, res) => {
  try {
    const { jobCard, serviceTask, mechanic, estimatedHours, remarks } =
      req.body;

    if (!jobCard || !mechanic) {
      return res.status(400).json({
        success: false,
        message: "Job card and mechanic are required",
      });
    }

    if (!isValidId(jobCard) || !isValidId(mechanic)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job card or mechanic ID",
      });
    }

    const jobCardExists = await JobCard.findById(jobCard);

    if (!jobCardExists) {
      return res.status(404).json({
        success: false,
        message: "Job card not found",
      });
    }

    if (
      ["completed", "delivered", "cancelled"].includes(jobCardExists.jobStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot assign mechanic to a closed job card",
      });
    }

    const mechanicExists = await User.findById(mechanic);

    if (!mechanicExists) {
      return res.status(404).json({
        success: false,
        message: "Mechanic user not found",
      });
    }

    if (mechanicExists.role !== "mechanic") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not a mechanic",
      });
    }

    let taskExists = null;

    if (serviceTask) {
      if (!isValidId(serviceTask)) {
        return res.status(400).json({
          success: false,
          message: "Invalid service task ID",
        });
      }

      taskExists = await ServiceTask.findOne({
        _id: serviceTask,
        jobCard,
      });

      if (!taskExists) {
        return res.status(404).json({
          success: false,
          message: "Service task not found for this job card",
        });
      }

      if (taskExists.taskStatus === "completed") {
        return res.status(400).json({
          success: false,
          message: "Completed task cannot be assigned",
        });
      }
    }

    const assignment = await MechanicAssignment.create({
      jobCard,
      serviceTask: serviceTask || null,
      mechanic,
      assignedBy: req.user._id,
      estimatedHours: estimatedHours || 0,
      remarks,
      createdBy: req.user._id,
    });

    if (taskExists) {
      taskExists.assignedMechanic = mechanic;
      taskExists.taskStatus = "assigned";
      await taskExists.save();
    }

    jobCardExists.mechanic = mechanic;
    await jobCardExists.save();

    return res.status(201).json({
      success: true,
      message: "Mechanic assigned successfully",
      data: assignment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All Mechanic Assignments
exports.getAllMechanicAssignments = async (req, res) => {
  try {
    const filter = {};

    if (req.query.jobCard) {
      filter.jobCard = req.query.jobCard;
    }

    if (req.query.mechanic) {
      filter.mechanic = req.query.mechanic;
    }

    if (req.query.assignmentStatus) {
      filter.assignmentStatus = req.query.assignmentStatus;
    }

    const assignments = await MechanicAssignment.find(filter)
      .populate("jobCard")
      .populate("serviceTask")
      .populate("mechanic", "name email role")
      .populate("assignedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Mechanic Assignment Status
exports.updateMechanicAssignment = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }

    const assignment = await MechanicAssignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Mechanic assignment not found",
      });
    }

    const allowedFields = [
      "assignmentStatus",
      "startedAt",
      "completedAt",
      "actualHours",
      "remarks",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        assignment[field] = req.body[field];
      }
    });

    if (
      assignment.assignmentStatus === "in_progress" &&
      !assignment.startedAt
    ) {
      assignment.startedAt = new Date();
    }

    if (
      assignment.assignmentStatus === "completed" &&
      !assignment.completedAt
    ) {
      assignment.completedAt = new Date();
    }

    await assignment.save();

    if (assignment.serviceTask) {
      const task = await ServiceTask.findById(assignment.serviceTask);

      if (task) {
        task.taskStatus =
          assignment.assignmentStatus === "completed"
            ? "completed"
            : assignment.assignmentStatus === "in_progress"
              ? "in_progress"
              : task.taskStatus;

        if (assignment.assignmentStatus === "completed") {
          task.completedAt = assignment.completedAt;
          task.actualHours = assignment.actualHours;
        }

        await task.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Mechanic assignment updated successfully",
      data: assignment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
