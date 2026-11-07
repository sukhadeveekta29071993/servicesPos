const mongoose = require("mongoose");

const SupplierPayment = require("../models/SupplierPayment");
const Purchase = require("../models/Purchase");
const Vendor = require("../models/Vendor");

const roundAmount = (amount) =>
  Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

const handleError = (res, error) => {
  console.error("Supplier Payment Controller Error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Payment number already exists",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// CREATE SUPPLIER PAYMENT
const addSupplierPayment = async (req, res) => {
  let payment;

  try {
    const {
      paymentNumber,
      vendor,
      purchase,
      amount,
      paymentMethod,
      transactionReference,
      paymentDate,
      paymentType = "purchase",
      notes,
    } = req.body;

    if (!paymentNumber || !vendor || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message:
          "Payment number, vendor, amount and payment method are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(vendor)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
    }

    if (!["purchase", "advance"].includes(paymentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment type",
      });
    }

    const vendorExists = await Vendor.findOne({
      _id: vendor,
      status: "active",
    });

    if (!vendorExists) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or inactive",
      });
    }

    let purchaseRecord = null;

    if (paymentType === "purchase") {
      if (!purchase || !mongoose.Types.ObjectId.isValid(purchase)) {
        return res.status(400).json({
          success: false,
          message: "Valid purchase ID is required for purchase payment",
        });
      }

      purchaseRecord = await Purchase.findById(purchase);

      if (!purchaseRecord) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      if (String(purchaseRecord.vendor) !== String(vendor)) {
        return res.status(400).json({
          success: false,
          message: "Selected purchase does not belong to this vendor",
        });
      }

      if (purchaseRecord.purchaseStatus !== "completed") {
        return res.status(400).json({
          success: false,
          message: "Payment is allowed only for completed purchases",
        });
      }

      if (parsedAmount > Number(purchaseRecord.balanceAmount)) {
        return res.status(400).json({
          success: false,
          message: "Payment amount cannot exceed purchase balance",
        });
      }
    } else if (purchase) {
      return res.status(400).json({
        success: false,
        message: "Advance payment should not contain a purchase ID",
      });
    }

    let parsedDate = new Date();

    if (paymentDate !== undefined) {
      parsedDate = new Date(paymentDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment date",
        });
      }
    }

    payment = await SupplierPayment.create({
      paymentNumber,
      vendor,
      purchase: purchaseRecord ? purchaseRecord._id : null,
      amount: roundAmount(parsedAmount),
      paymentMethod,
      transactionReference,
      paymentDate: parsedDate,
      paymentStatus: "completed",
      paymentType,
      notes,
      createdBy: req.user._id,
    });

    // Update purchase payment totals
    if (purchaseRecord) {
      const newPaidAmount = roundAmount(
        Number(purchaseRecord.paidAmount || 0) + parsedAmount,
      );

      const newBalanceAmount = roundAmount(
        Number(purchaseRecord.grandTotal) - newPaidAmount,
      );

      purchaseRecord.paidAmount = newPaidAmount;
      purchaseRecord.balanceAmount = newBalanceAmount;

      purchaseRecord.paymentStatus =
        newBalanceAmount === 0
          ? "paid"
          : newPaidAmount > 0
            ? "partial"
            : "unpaid";

      try {
        await purchaseRecord.save();
      } catch (error) {
        await SupplierPayment.findByIdAndDelete(payment._id);
        throw error;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Supplier payment recorded successfully",
      data: payment,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET ALL SUPPLIER PAYMENTS
const getSupplierPayments = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.vendor) {
      if (!mongoose.Types.ObjectId.isValid(req.query.vendor)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vendor ID",
        });
      }

      filter.vendor = req.query.vendor;
    }

    if (req.query.purchase) {
      if (!mongoose.Types.ObjectId.isValid(req.query.purchase)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID",
        });
      }

      filter.purchase = req.query.purchase;
    }

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod;
    }

    if (req.query.paymentType) {
      filter.paymentType = req.query.paymentType;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.paymentDate = {};

      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        filter.paymentDate.$gte = startDate;
      }

      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        endDate.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = endDate;
      }
    }

    const [payments, total] = await Promise.all([
      SupplierPayment.find(filter)
        .populate("vendor", "vendorCode name mobile")
        .populate(
          "purchase",
          "purchaseNumber grandTotal paidAmount balanceAmount paymentStatus",
        )
        .populate("createdBy", "name email")
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),

      SupplierPayment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: payments,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET SUPPLIER PAYMENT BY ID
const getSupplierPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier payment ID",
      });
    }

    const payment = await SupplierPayment.findById(id)
      .populate("vendor", "vendorCode name mobile email")
      .populate(
        "purchase",
        "purchaseNumber grandTotal paidAmount balanceAmount paymentStatus",
      )
      .populate("createdBy", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Supplier payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// CANCEL SUPPLIER PAYMENT
const cancelSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier payment ID",
      });
    }

    const payment = await SupplierPayment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Supplier payment not found",
      });
    }

    if (payment.paymentStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Only completed payments can be cancelled",
      });
    }

    let purchaseRecord = null;

    if (payment.paymentType === "purchase" && payment.purchase) {
      purchaseRecord = await Purchase.findById(payment.purchase);

      if (!purchaseRecord) {
        return res.status(404).json({
          success: false,
          message: "Related purchase not found",
        });
      }

      const newPaidAmount = roundAmount(
        Number(purchaseRecord.paidAmount || 0) - Number(payment.amount),
      );

      if (newPaidAmount < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Payment cannot be reversed because purchase totals are inconsistent",
        });
      }

      const newBalanceAmount = roundAmount(
        Number(purchaseRecord.grandTotal) - newPaidAmount,
      );

      purchaseRecord.paidAmount = newPaidAmount;
      purchaseRecord.balanceAmount = newBalanceAmount;

      purchaseRecord.paymentStatus =
        newBalanceAmount === 0
          ? "paid"
          : newPaidAmount > 0
            ? "partial"
            : "unpaid";

      await purchaseRecord.save();
    }

    payment.paymentStatus = "cancelled";
    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Supplier payment cancelled successfully",
      data: payment,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  addSupplierPayment,
  getSupplierPayments,
  getSupplierPaymentById,
  cancelSupplierPayment,
};
