const mongoose = require("mongoose");

const Vendor = require("../models/Vendor");
const Purchase = require("../models/Purchase");
const SupplierPayment = require("../models/SupplierPayment");

// Get Vendor Ledger
const getVendorLedger = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    // Validate Vendor ID
    if (!mongoose.isValidObjectId(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    // Validate dates
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (
      (startDate && Number.isNaN(start.getTime())) ||
      (endDate && Number.isNaN(end.getTime()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (start && end && start > end) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be greater than end date",
      });
    }

    if (end) {
      end.setHours(23, 59, 59, 999);
    }

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const vendor = await Vendor.findById(vendorId).lean();

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // Get completed purchases
    const purchases = await Purchase.find({
      vendor: vendorId,
      purchaseStatus: "completed",
    })
      .select(
        "purchaseNumber invoiceDate grandTotal vendorInvoiceNumber createdAt",
      )
      .lean();

    // Get completed supplier payments
    const payments = await SupplierPayment.find({
      vendor: vendorId,
      paymentStatus: "completed",
    })
      .select(
        "paymentNumber paymentDate amount paymentMethod paymentType purchase transactionReference createdAt",
      )
      .populate("purchase", "purchaseNumber")
      .lean();

    // Convert purchases into debit transactions
    const purchaseEntries = purchases.map((purchase) => ({
      transactionDate: purchase.invoiceDate || purchase.createdAt,
      createdAt: purchase.createdAt,
      transactionType: "purchase",
      referenceNumber: purchase.purchaseNumber,
      description: `Purchase - ${purchase.vendorInvoiceNumber || purchase.purchaseNumber}`,
      debit: Number(purchase.grandTotal || 0),
      credit: 0,
      purchaseId: purchase._id,
    }));

    // Convert payments into credit transactions
    const paymentEntries = payments.map((payment) => ({
      transactionDate: payment.paymentDate || payment.createdAt,
      createdAt: payment.createdAt,
      transactionType:
        payment.paymentType === "advance"
          ? "advance_payment"
          : "supplier_payment",
      referenceNumber: payment.paymentNumber,
      description:
        payment.paymentType === "advance"
          ? "Advance Payment"
          : "Supplier Payment",
      debit: 0,
      credit: Number(payment.amount || 0),
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.transactionReference,
      purchaseId: payment.purchase?._id || payment.purchase || null,
    }));

    // Combine and sort transactions chronologically
    const allEntries = [...purchaseEntries, ...paymentEntries];

    allEntries.sort((a, b) => {
      const dateDifference =
        new Date(a.transactionDate) - new Date(b.transactionDate);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    // Calculate running balance before applying date filters
    let runningBalance = 0;

    const ledgerEntries = allEntries.map((entry) => {
      runningBalance += entry.debit - entry.credit;

      return {
        ...entry,
        balance: Number(runningBalance.toFixed(2)),
      };
    });

    // Apply date filters
    const filteredEntries = ledgerEntries.filter((entry) => {
      const transactionDate = new Date(entry.transactionDate);

      if (start && transactionDate < start) {
        return false;
      }

      if (end && transactionDate > end) {
        return false;
      }

      return true;
    });

    // Calculate filtered period totals
    const totalDebit = filteredEntries.reduce(
      (total, entry) => total + entry.debit,
      0,
    );

    const totalCredit = filteredEntries.reduce(
      (total, entry) => total + entry.credit,
      0,
    );

    // Pagination
    const totalRecords = filteredEntries.length;
    const totalPages = Math.ceil(totalRecords / pageLimit);
    const skip = (currentPage - 1) * pageLimit;

    const paginatedEntries = filteredEntries.slice(skip, skip + pageLimit);

    return res.status(200).json({
      success: true,
      message: "Vendor ledger fetched successfully",

      vendor: {
        _id: vendor._id,
        vendorCode: vendor.vendorCode,
        name: vendor.name,
        companyName: vendor.companyName,
        mobile: vendor.mobile,
        email: vendor.email,
      },

      summary: {
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
        closingBalance:
          filteredEntries.length > 0
            ? filteredEntries[filteredEntries.length - 1].balance
            : 0,
        totalTransactions: totalRecords,
      },

      pagination: {
        currentPage,
        limit: pageLimit,
        totalRecords,
        totalPages,
      },

      ledger: paginatedEntries,
    });
  } catch (error) {
    console.error("Get Vendor Ledger Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor ledger",
      error: error.message,
    });
  }
};

module.exports = {
  getVendorLedger,
};
