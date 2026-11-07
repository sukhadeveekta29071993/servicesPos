const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  cancelExpense,
  deleteExpense,
} = require("../controllers/expenseController");

// Expense Routes
router.post("/", protect, createExpense);

router.get("/", protect, getAllExpenses);

router.get("/:id", protect, getExpenseById);

router.put("/:id", protect, updateExpense);

router.patch("/:id/cancel", protect, cancelExpense);

router.delete("/:id", protect, deleteExpense);

module.exports = router;
