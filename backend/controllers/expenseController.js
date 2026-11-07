const mongoose = require("mongoose");
const Expense = require("../models/Expense");

const handleError = (res, error) => {
  console.error("Expense Error:", error);

  return res.status(500).json({
    success: false,
    message: "Something went wrong",
    error: error.message,
  });
};

// Create Expense
const createExpense = async (req, res) => {
  try {
    const {
      expenseTitle,
      category,
      description,
      vendor,
      expenseDate,
      amount,
      discount = 0,
      gstRate = 0,
      paymentMethod,
      paymentStatus = "paid",
      paidAmount,
      referenceNumber,
      receiptUrl,
      notes,
    } = req.body;

    if (!expenseTitle || !category || amount === undefined || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message:
          "Expense title, category, amount and payment method are required",
      });
    }

    if (vendor && !mongoose.Types.ObjectId.isValid(vendor)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const parsedAmount = Number(amount);
    const parsedDiscount = Number(discount);
    const parsedGstRate = Number(gstRate);

    if (
      !Number.isFinite(parsedAmount) ||
      !Number.isFinite(parsedDiscount) ||
      !Number.isFinite(parsedGstRate) ||
      parsedAmount <= 0 ||
      parsedDiscount < 0 ||
      parsedDiscount > parsedAmount
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount, discount or GST rate",
      });
    }

    const taxableAmount = Number((parsedAmount - parsedDiscount).toFixed(2));

    const gstAmount = Number(
      ((taxableAmount * parsedGstRate) / 100).toFixed(2),
    );

    const totalAmount = Number((taxableAmount + gstAmount).toFixed(2));

    const finalPaidAmount =
      paidAmount === undefined
        ? paymentStatus === "paid"
          ? totalAmount
          : 0
        : Number(paidAmount);

    if (
      !Number.isFinite(finalPaidAmount) ||
      finalPaidAmount < 0 ||
      finalPaidAmount > totalAmount
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid paid amount",
      });
    }

    const balanceAmount = Number((totalAmount - finalPaidAmount).toFixed(2));

    const finalPaymentStatus =
      balanceAmount === 0
        ? "paid"
        : finalPaidAmount > 0
          ? "partially_paid"
          : "pending";

    const expenseNumber = `EXP-${Date.now()}`;

    const expense = await Expense.create({
      expenseNumber,
      expenseTitle,
      category,
      description,
      vendor: vendor || null,
      expenseDate,
      amount: parsedAmount,
      discount: parsedDiscount,
      gstRate: parsedGstRate,
      taxableAmount,
      gstAmount,
      totalAmount,
      paymentMethod,
      paymentStatus: finalPaymentStatus,
      paidAmount: finalPaidAmount,
      balanceAmount,
      referenceNumber,
      receiptUrl,
      notes,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: expense,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Get All Expenses
const getAllExpenses = async (req, res) => {
  try {
    const {
      category,
      paymentStatus,
      expenseStatus,
      vendor,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (expenseStatus) filter.expenseStatus = expenseStatus;
    if (vendor) filter.vendor = vendor;

    if (startDate || endDate) {
      filter.expenseDate = {};

      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { expenseNumber: { $regex: search, $options: "i" } },
        { expenseTitle: { $regex: search, $options: "i" } },
        { referenceNumber: { $regex: search, $options: "i" } },
      ];
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    const [expenses, total] = await Promise.all([
      Expense.find(filter)
        .populate("vendor")
        .populate("createdBy", "name email")
        .sort({ expenseDate: -1 })
        .skip(skip)
        .limit(limitNumber),

      Expense.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      data: expenses,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Get Expense By ID
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id)
      .populate("vendor")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Update Expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (expense.expenseStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled expense cannot be updated",
      });
    }

    const allowedFields = [
      "expenseTitle",
      "category",
      "description",
      "vendor",
      "expenseDate",
      "amount",
      "discount",
      "gstRate",
      "paymentMethod",
      "referenceNumber",
      "receiptUrl",
      "notes",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        expense[field] = req.body[field];
      }
    });

    if (
      expense.vendor &&
      !mongoose.Types.ObjectId.isValid(expense.vendor.toString())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const amount = Number(expense.amount);
    const discount = Number(expense.discount);
    const gstRate = Number(expense.gstRate);

    if (
      !Number.isFinite(amount) ||
      !Number.isFinite(discount) ||
      !Number.isFinite(gstRate) ||
      amount <= 0 ||
      discount < 0 ||
      discount > amount
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount, discount or GST rate",
      });
    }

    expense.taxableAmount = Number((amount - discount).toFixed(2));
    expense.gstAmount = Number(
      ((expense.taxableAmount * gstRate) / 100).toFixed(2),
    );
    expense.totalAmount = Number(
      (expense.taxableAmount + expense.gstAmount).toFixed(2),
    );

    if (expense.paidAmount > expense.totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Paid amount cannot exceed updated total amount",
      });
    }

    expense.balanceAmount = Number(
      (expense.totalAmount - expense.paidAmount).toFixed(2),
    );

    expense.paymentStatus =
      expense.balanceAmount === 0
        ? "paid"
        : expense.paidAmount > 0
          ? "partially_paid"
          : "pending";

    expense.updatedBy = req.user._id;

    await expense.save();

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Cancel Expense
const cancelExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    expense.expenseStatus = "cancelled";
    expense.updatedBy = req.user._id;

    await expense.save();

    return res.status(200).json({
      success: true,
      message: "Expense cancelled successfully",
      data: expense,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Delete Expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expense ID",
      });
    }

    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  cancelExpense,
  deleteExpense,
};
