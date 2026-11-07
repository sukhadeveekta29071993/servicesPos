const mongoose = require("mongoose");

const Vendor = require("../models/Vendor");
const Purchase = require("../models/Purchase");
const SupplierPayment = require("../models/SupplierPayment");

const roundAmount = (amount) =>
  Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

const handleError = (res, error) => {
  console.error("Vendor Outstanding Controller Error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// GET ALL VENDOR OUTSTANDING
const getVendorOutstanding = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const skip = (page - 1) * limit;

    const vendorFilter = {
      status: "active",
    };

    if (req.query.vendor) {
      if (!mongoose.Types.ObjectId.isValid(req.query.vendor)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vendor ID",
        });
      }

      vendorFilter._id = req.query.vendor;
    }

    const [vendors, total] = await Promise.all([
      Vendor.find(vendorFilter)
        .select("vendorCode name companyName mobile email openingBalance")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),

      Vendor.countDocuments(vendorFilter),
    ]);

    const vendorIds = vendors.map((vendor) => vendor._id);

    const [purchaseSummary, paymentSummary] = await Promise.all([
      Purchase.aggregate([
        {
          $match: {
            vendor: { $in: vendorIds },
            purchaseStatus: "completed",
          },
        },
        {
          $group: {
            _id: "$vendor",
            totalPurchases: { $sum: "$grandTotal" },
            totalPurchasePaid: { $sum: "$paidAmount" },
            totalPurchaseOutstanding: { $sum: "$balanceAmount" },
            purchaseCount: { $sum: 1 },
          },
        },
      ]),

      SupplierPayment.aggregate([
        {
          $match: {
            vendor: { $in: vendorIds },
            paymentStatus: "completed",
          },
        },
        {
          $group: {
            _id: {
              vendor: "$vendor",
              paymentType: "$paymentType",
            },
            totalAmount: { $sum: "$amount" },
            paymentCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const purchaseMap = new Map(
      purchaseSummary.map((item) => [String(item._id), item]),
    );

    const paymentMap = new Map();

    paymentSummary.forEach((item) => {
      const vendorId = String(item._id.vendor);

      if (!paymentMap.has(vendorId)) {
        paymentMap.set(vendorId, {
          purchasePayments: 0,
          advancePayments: 0,
          purchasePaymentCount: 0,
          advancePaymentCount: 0,
        });
      }

      const summary = paymentMap.get(vendorId);

      if (item._id.paymentType === "purchase") {
        summary.purchasePayments = item.totalAmount;
        summary.purchasePaymentCount = item.paymentCount;
      }

      if (item._id.paymentType === "advance") {
        summary.advancePayments = item.totalAmount;
        summary.advancePaymentCount = item.paymentCount;
      }
    });

    const data = vendors.map((vendor) => {
      const vendorId = String(vendor._id);

      const purchase = purchaseMap.get(vendorId) || {};

      const payment = paymentMap.get(vendorId) || {
        purchasePayments: 0,
        advancePayments: 0,
        purchasePaymentCount: 0,
        advancePaymentCount: 0,
      };

      const totalPurchases = roundAmount(purchase.totalPurchases || 0);

      const purchasePaidAmount = roundAmount(purchase.totalPurchasePaid || 0);

      const totalOutstanding = roundAmount(
        purchase.totalPurchaseOutstanding || 0,
      );

      const totalAdvancePayments = roundAmount(payment.advancePayments);

      const netOutstanding = roundAmount(
        totalOutstanding - totalAdvancePayments,
      );

      return {
        vendor: {
          _id: vendor._id,
          vendorCode: vendor.vendorCode,
          name: vendor.name,
          companyName: vendor.companyName,
          mobile: vendor.mobile,
          email: vendor.email,
        },

        totalPurchases,

        purchasePaidAmount,

        purchasePaymentRecords: payment.purchasePaymentCount,

        totalOutstanding,

        totalAdvancePayments,

        advancePaymentRecords: payment.advancePaymentCount,

        netOutstanding,
      };
    });

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET SINGLE VENDOR OUTSTANDING DETAILS
const getVendorOutstandingById = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const vendor = await Vendor.findById(vendorId).select(
      "vendorCode name companyName mobile email openingBalance status",
    );

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const [purchaseSummary, purchasePayments, advancePayments, purchases] =
      await Promise.all([
        Purchase.aggregate([
          {
            $match: {
              vendor: vendor._id,
              purchaseStatus: "completed",
            },
          },
          {
            $group: {
              _id: null,
              totalPurchases: { $sum: "$grandTotal" },
              totalPaid: { $sum: "$paidAmount" },
              totalOutstanding: { $sum: "$balanceAmount" },
              purchaseCount: { $sum: 1 },
            },
          },
        ]),

        SupplierPayment.find({
          vendor: vendor._id,
          paymentType: "purchase",
          paymentStatus: "completed",
        })
          .populate(
            "purchase",
            "purchaseNumber grandTotal paidAmount balanceAmount paymentStatus",
          )
          .populate("createdBy", "name email")
          .sort({ paymentDate: -1 }),

        SupplierPayment.find({
          vendor: vendor._id,
          paymentType: "advance",
          paymentStatus: "completed",
        })
          .populate("createdBy", "name email")
          .sort({ paymentDate: -1 }),

        Purchase.find({
          vendor: vendor._id,
          purchaseStatus: "completed",
        })
          .select(
            "purchaseNumber invoiceDate grandTotal paidAmount balanceAmount paymentStatus",
          )
          .sort({ invoiceDate: -1 }),
      ]);

    const summary = purchaseSummary[0] || {};

    const totalPurchases = roundAmount(summary.totalPurchases || 0);

    const purchasePaidAmount = roundAmount(summary.totalPaid || 0);

    const totalOutstanding = roundAmount(summary.totalOutstanding || 0);

    const totalAdvancePayments = roundAmount(
      advancePayments.reduce(
        (total, payment) => total + Number(payment.amount),
        0,
      ),
    );

    const netOutstanding = roundAmount(totalOutstanding - totalAdvancePayments);

    return res.status(200).json({
      success: true,

      data: {
        vendor,

        summary: {
          totalPurchases,
          purchasePaidAmount,
          totalOutstanding,
          totalAdvancePayments,
          netOutstanding,
          purchaseCount: summary.purchaseCount || 0,
          purchasePaymentCount: purchasePayments.length,
          advancePaymentCount: advancePayments.length,
        },

        purchases,

        purchasePayments,

        advancePayments,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getVendorOutstanding,
  getVendorOutstandingById,
};
