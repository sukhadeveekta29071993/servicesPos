const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  // Service Booking
  createServiceBooking,
  getAllServiceBookings,
  getServiceBookingById,
  updateServiceBooking,
  cancelServiceBooking,

  // Job Card
  createJobCard,
  getAllJobCards,
  getJobCardById,
  updateJobCard,

  // Service Task
  createServiceTask,
  getAllServiceTasks,
  updateServiceTask,
  deleteServiceTask,

  // Mechanic Assignment
  assignMechanic,
  getAllMechanicAssignments,
  updateMechanicAssignment,
} = require("../controllers/serviceController");

// ==========================================
// SERVICE BOOKING ROUTES
// ==========================================

router.post("/bookings", protect, createServiceBooking);
router.get("/bookings", protect, getAllServiceBookings);
router.get("/bookings/:id", protect, getServiceBookingById);
router.put("/bookings/:id", protect, updateServiceBooking);
router.patch("/bookings/:id/cancel", protect, cancelServiceBooking);

// ==========================================
// JOB CARD ROUTES
// ==========================================

router.post("/job-cards", protect, createJobCard);
router.get("/job-cards", protect, getAllJobCards);
router.get("/job-cards/:id", protect, getJobCardById);
router.put("/job-cards/:id", protect, updateJobCard);

// ==========================================
// SERVICE TASK ROUTES
// ==========================================

router.post("/tasks", protect, createServiceTask);
router.get("/tasks", protect, getAllServiceTasks);
router.put("/tasks/:id", protect, updateServiceTask);
router.delete("/tasks/:id", protect, deleteServiceTask);

// ==========================================
// MECHANIC ASSIGNMENT ROUTES
// ==========================================

router.post("/assignments", protect, assignMechanic);
router.get("/assignments", protect, getAllMechanicAssignments);
router.put("/assignments/:id", protect, updateMechanicAssignment);

module.exports = router;
