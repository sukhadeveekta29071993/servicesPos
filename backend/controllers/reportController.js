const CounterInvoice = require("../models/CounterInvoice");
const Purchase = require("../models/Purchase");
const VehicleSale = require("../models/VehicleSale");
const ServiceInvoice = require("../models/ServiceInvoice");
const Expense = require("../models/Expense");
const Payment = require("../models/Payment");
const Inventory = require("../models/Inventory");

const handleError = (res, error) => {
  console.error("Report Error:", error);

  return res.status(500).json({
    success: false,
    message: "Unable to generate report",
    error: error.message,
  });
};

// Date Filter Helper
const getDateFilter = (startDate, endDate, field) => {
  const filter = {};

  if (startDate || endDate) {
    filter[field] = {};

    if (startDate) {
      filter[field].$gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter[field].$lte = end;
    }
  }

  return filter;
};

// Dashboard Summary
const getDashboardSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const vehicleFilter = {
      saleStatus: "completed",
      ...getDateFilter(startDate, endDate, "saleDate"),
    };

    const serviceFilter = {
      invoiceStatus: "issued",
      ...getDateFilter(startDate, endDate, "invoiceDate"),
    };

    const expenseFilter = {
      expenseStatus: "active",
      ...getDateFilter(startDate, endDate, "expenseDate"),
    };

    const purchaseFilter = {
      purchaseStatus: "completed",
      ...getDateFilter(startDate, endDate, "invoiceDate"),
    };

    const counterFilter = {
      invoiceStatus: "issued",
      ...getDateFilter(startDate, endDate, "invoiceDate"),
    };

    const [vehicleSales, counterSales, serviceRevenue, expenses, purchases] =
      await Promise.all([
        VehicleSale.aggregate([
          { $match: vehicleFilter },
          {
            $group: {
              _id: null,
              totalSales: { $sum: "$grandTotal" },
              count: { $sum: 1 },
            },
          },
        ]),

        CounterInvoice.aggregate([
          { $match: counterFilter },
          {
            $group: {
              _id: null,
              totalSales: { $sum: "$grandTotal" },
              count: { $sum: 1 },
            },
          },
        ]),

        ServiceInvoice.aggregate([
          { $match: serviceFilter },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$grandTotal" },
              count: { $sum: 1 },
            },
          },
        ]),

        Expense.aggregate([
          { $match: expenseFilter },
          {
            $group: {
              _id: null,
              totalExpenses: { $sum: "$totalAmount" },
              count: { $sum: 1 },
            },
          },
        ]),

        Purchase.aggregate([
          { $match: purchaseFilter },
          {
            $group: {
              _id: null,
              totalPurchases: { $sum: "$grandTotal" },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const vehicleSalesTotal = vehicleSales[0]?.totalSales || 0;
    const counterSalesTotal = counterSales[0]?.totalSales || 0;
    const serviceTotal = serviceRevenue[0]?.totalRevenue || 0;
    const expenseTotal = expenses[0]?.totalExpenses || 0;
    const purchaseTotal = purchases[0]?.totalPurchases || 0;

    const totalRevenue = vehicleSalesTotal + counterSalesTotal + serviceTotal;

    return res.status(200).json({
      success: true,
      data: {
        vehicleSales: {
          total: vehicleSalesTotal,
          count: vehicleSales[0]?.count || 0,
        },
        counterSales: {
          total: counterSalesTotal,
          count: counterSales[0]?.count || 0,
        },
        serviceRevenue: {
          total: serviceTotal,
          count: serviceRevenue[0]?.count || 0,
        },
        expenses: {
          total: expenseTotal,
          count: expenses[0]?.count || 0,
        },
        purchases: {
          total: purchaseTotal,
          count: purchases[0]?.count || 0,
        },
        totalRevenue,
        totalExpenses: expenseTotal,
        estimatedNetAmount: totalRevenue - expenseTotal,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Counter Sales Report
const getCounterSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      invoiceStatus: "issued",
      ...getDateFilter(startDate, endDate, "invoiceDate"),
    };

    const report = await CounterInvoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: "$invoiceDate" },
            month: { $month: "$invoiceDate" },
          },
          totalSales: { $sum: "$grandTotal" },
          totalPaid: { $sum: "$paidAmount" },
          totalBalance: { $sum: "$balanceAmount" },
          totalInvoices: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Payment Report
const getPaymentReport = async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod } = req.query;

    const filter = {
      paymentStatus: "completed",
      ...getDateFilter(startDate, endDate, "paymentDate"),
    };

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    const report = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: "$paymentDate" },
            month: { $month: "$paymentDate" },
            paymentMethod: "$paymentMethod",
          },
          totalAmount: { $sum: "$amount" },
          totalPayments: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Vehicle Sales Report
const getVehicleSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      saleStatus: "completed",
      ...getDateFilter(startDate, endDate, "saleDate"),
    };

    const report = await VehicleSale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: "$saleDate" },
            month: { $month: "$saleDate" },
          },
          totalSales: { $sum: "$grandTotal" },
          totalPaid: { $sum: "$paidAmount" },
          totalBalance: { $sum: "$balanceAmount" },
          totalInvoices: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Inventory Report
const getInventoryReport = async (req, res) => {
  try {
    const { status, lowStock } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const report = await Inventory.find(filter)
      .populate(
        "product",
        "sku name category brand purchasePrice sellingPrice reorderLevel",
      )
      .sort({ currentStock: 1 });

    let inventoryData = report;

    // Low Stock Filter
    if (lowStock === "true") {
      inventoryData = report.filter((item) => {
        return (
          item.product && item.currentStock <= (item.product.reorderLevel || 0)
        );
      });
    }

    const summary = inventoryData.reduce(
      (acc, item) => {
        acc.totalProducts += 1;
        acc.totalCurrentStock += item.currentStock;
        acc.totalReservedStock += item.reservedStock;
        acc.totalAvailableStock += item.availableStock;

        return acc;
      },
      {
        totalProducts: 0,
        totalCurrentStock: 0,
        totalReservedStock: 0,
        totalAvailableStock: 0,
      },
    );

    return res.status(200).json({
      success: true,
      summary,
      data: inventoryData,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getGSTReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const vehicleFilter = {
      saleStatus: "completed",
      ...getDateFilter(startDate, endDate, "saleDate"),
    };

    const counterFilter = {
      invoiceStatus: "issued",
      ...getDateFilter(startDate, endDate, "invoiceDate"),
    };

    const serviceFilter = {
      invoiceStatus: "issued",
      ...getDateFilter(startDate, endDate, "invoiceDate"),
    };

    const purchaseFilter = {
      purchaseStatus: "completed",
      ...getDateFilter(startDate, endDate, "invoiceDate"),
    };

    const [vehicleGST, counterGST, serviceGST, purchaseGST] = await Promise.all(
      [
        VehicleSale.aggregate([
          { $match: vehicleFilter },
          {
            $group: {
              _id: null,
              gstAmount: { $sum: "$gstAmount" },
              taxableAmount: { $sum: "$taxableAmount" },
            },
          },
        ]),

        CounterInvoice.aggregate([
          { $match: counterFilter },
          {
            $group: {
              _id: null,
              gstAmount: { $sum: "$gstAmount" },
              taxableAmount: { $sum: "$taxableAmount" },
            },
          },
        ]),

        ServiceInvoice.aggregate([
          { $match: serviceFilter },
          {
            $group: {
              _id: null,
              gstAmount: { $sum: "$gstAmount" },
              taxableAmount: { $sum: "$taxableAmount" },
            },
          },
        ]),

        Purchase.aggregate([
          { $match: purchaseFilter },
          {
            $group: {
              _id: null,
              gstAmount: { $sum: "$totalGST" },
              taxableAmount: { $sum: "$totalTaxableAmount" },
            },
          },
        ]),
      ],
    );

    const vehicleGSTAmount = vehicleGST[0]?.gstAmount || 0;
    const counterGSTAmount = counterGST[0]?.gstAmount || 0;
    const serviceGSTAmount = serviceGST[0]?.gstAmount || 0;
    const purchaseGSTAmount = purchaseGST[0]?.gstAmount || 0;

    const totalSalesGST =
      vehicleGSTAmount + counterGSTAmount + serviceGSTAmount;

    return res.status(200).json({
      success: true,
      data: {
        vehicleSalesGST: vehicleGSTAmount,
        counterSalesGST: counterGSTAmount,
        serviceGST: serviceGSTAmount,
        totalSalesGST,
        purchaseGST: purchaseGSTAmount,
        estimatedGSTDifference: totalSalesGST - purchaseGSTAmount,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Service Revenue Report
const getServiceRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      invoiceStatus: "issued",
      ...getDateFilter(startDate, endDate, "invoiceDate"),
    };

    const report = await ServiceInvoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: "$invoiceDate" },
            month: { $month: "$invoiceDate" },
          },
          partsAmount: { $sum: "$partsAmount" },
          labourAmount: { $sum: "$labourAmount" },
          otherAmount: { $sum: "$otherAmount" },
          totalRevenue: { $sum: "$grandTotal" },
          totalPaid: { $sum: "$paidAmount" },
          totalBalance: { $sum: "$balanceAmount" },
          totalInvoices: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Expense Report
const getExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    const filter = {
      expenseStatus: "active",
      ...getDateFilter(startDate, endDate, "expenseDate"),
    };

    if (category) {
      filter.category = category;
    }

    const report = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$totalAmount" },
          totalPaid: { $sum: "$paidAmount" },
          totalBalance: { $sum: "$balanceAmount" },
          totalExpenses: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// Purchase Report
const getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {
      purchaseStatus: "completed",
      ...getDateFilter(startDate, endDate, "invoiceDate"),
    };

    const report = await Purchase.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: "$invoiceDate" },
            month: { $month: "$invoiceDate" },
          },
          totalPurchases: { $sum: "$grandTotal" },
          totalPaid: { $sum: "$paidAmount" },
          totalBalance: { $sum: "$balanceAmount" },
          totalInvoices: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getDashboardSummary,
  getVehicleSalesReport,
  getServiceRevenueReport,
  getExpenseReport,
  getPurchaseReport,
  getCounterSalesReport,
  getPaymentReport,
  getInventoryReport,
  getGSTReport,
};
