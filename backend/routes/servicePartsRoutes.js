const express = require("express");

const router = express.Router();

const {
  consumeServicePart,
  getAllServicePartConsumptions,
  getConsumptionsByJobCard,
  getServicePartConsumptionById,
} = require("../controllers/servicePartsController");

const { protect } = require("../middleware/authMiddleware");

// CONSUME SERVICE PART
router.post("/consume", protect, consumeServicePart);

// GET ALL SERVICE PART CONSUMPTIONS
router.get("/", protect, getAllServicePartConsumptions);

// GET CONSUMPTIONS BY JOB CARD
router.get("/job-card/:jobCardId", protect, getConsumptionsByJobCard);

// GET CONSUMPTION BY ID
router.get("/:id", protect, getServicePartConsumptionById);

module.exports = router;
