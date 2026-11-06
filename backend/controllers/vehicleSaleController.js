const VehicleSale = require("../models/VehicleSale");
const VehicleModel = require("../models/VehicleModel");
const VehicleUnit = require("../models/VehicleUnit");
const Customer = require("../models/Customer");

const handleError = (res, error) => {
  console.error("Vehicle Sale Error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Invoice number already exists",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID or field value",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

const getPaymentStatus = (paid, total) => {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
};

const populateSale = (query) =>
  query
    .populate("customer")
    .populate("vehicleModel")
    .populate("vehicleUnit")
    .populate("createdBy", "name email");

// CREATE VEHICLE SALE (DRAFT + RESERVE UNIT)
exports.createVehicleSale = async (req, res) => {
  let reservedUnitId = null;

  try {
    const {
      customer,
      vehicleModel,
      vehicleUnit,
      invoiceNumber,
      discount = 0,
      registrationNumber = "",
      notes = "",
    } = req.body;

    if (!customer || !vehicleModel || !vehicleUnit) {
      return res.status(400).json({
        success: false,
        message: "Customer, vehicle model and vehicle unit are required",
      });
    }

    const customerExists = await Customer.findById(customer);

    if (!customerExists) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const model = await VehicleModel.findOne({
      _id: vehicleModel,
      status: "active",
    });

    if (!model) {
      return res.status(404).json({
        success: false,
        message: "Active vehicle model not found",
      });
    }

    // Reserve only an available unit belonging to this model.
    const unit = await VehicleUnit.findOneAndUpdate(
      {
        _id: vehicleUnit,
        vehicleModel: model._id,
        stockStatus: "available",
      },
      { $set: { stockStatus: "reserved" } },
      { new: true },
    );

    if (!unit) {
      return res.status(409).json({
        success: false,
        message: "Vehicle unit is unavailable or does not belong to this model",
      });
    }

    reservedUnitId = unit._id;

    const price = model.exShowroomPrice;
    const discountAmount = Number(discount);

    if (
      !Number.isFinite(discountAmount) ||
      discountAmount < 0 ||
      discountAmount > price
    ) {
      await VehicleUnit.findByIdAndUpdate(unit._id, {
        stockStatus: "available",
      });
      reservedUnitId = null;

      return res.status(400).json({
        success: false,
        message: "Invalid discount amount",
      });
    }

    // GST-exclusive calculation.
    const taxableAmount = Number((price - discountAmount).toFixed(2));
    const gstAmount = Number(
      ((taxableAmount * model.gstRate) / 100).toFixed(2),
    );
    const grandTotal = Number((taxableAmount + gstAmount).toFixed(2));

    const sale = await VehicleSale.create({
      invoiceNumber: invoiceNumber || `VSI-${Date.now()}`,
      customer,
      vehicleModel: model._id,
      vehicleUnit: unit._id,
      registrationNumber,
      exShowroomPrice: price,
      discount: discountAmount,
      taxableAmount,
      gstRate: model.gstRate,
      gstAmount,
      grandTotal,
      paidAmount: 0,
      balanceAmount: grandTotal,
      paymentStatus: "unpaid",
      payments: [],
      saleStatus: "draft",
      deliveryStatus: "pending",
      notes,
      createdBy: req.user._id,
    });

    reservedUnitId = null;

    const populatedSale = await populateSale(VehicleSale.findById(sale._id));

    return res.status(201).json({
      success: true,
      message: "Vehicle sale draft created and unit reserved successfully",
      data: populatedSale,
    });
  } catch (error) {
    // Release reserved stock if invoice creation fails.
    if (reservedUnitId) {
      await VehicleUnit.findOneAndUpdate(
        { _id: reservedUnitId, stockStatus: "reserved" },
        { $set: { stockStatus: "available" } },
      );
    }

    return handleError(res, error);
  }
};

// GET ALL VEHICLE SALES
exports.getVehicleSales = async (req, res) => {
  try {
    const { saleStatus, paymentStatus, customer } = req.query;

    const filter = {};

    if (saleStatus) filter.saleStatus = saleStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (customer) filter.customer = customer;

    const sales = await populateSale(
      VehicleSale.find(filter).sort({ createdAt: -1 }),
    );

    return res.status(200).json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET SINGLE VEHICLE SALE
exports.getVehicleSaleById = async (req, res) => {
  try {
    const sale = await populateSale(VehicleSale.findById(req.params.id));

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Vehicle sale not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// GET SALES BY CUSTOMER
exports.getSalesByCustomer = async (req, res) => {
  try {
    const sales = await populateSale(
      VehicleSale.find({ customer: req.params.customerId }).sort({
        saleDate: -1,
      }),
    );

    return res.status(200).json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// RECORD PAYMENT
exports.recordVehicleSalePayment = async (req, res) => {
  try {
    const { amount, paymentMethod, transactionReference, notes } = req.body;

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero",
      });
    }

    if (
      !["cash", "upi", "card", "bank_transfer", "cheque", "other"].includes(
        paymentMethod,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const sale = await VehicleSale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Vehicle sale not found",
      });
    }

    if (sale.saleStatus === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot record payment for a cancelled sale",
      });
    }

    if (paymentAmount > sale.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount cannot exceed remaining balance",
      });
    }

    sale.payments.push({
      amount: paymentAmount,
      paymentMethod,
      transactionReference,
      notes,
      receivedBy: req.user._id,
    });

    sale.paidAmount = Number((sale.paidAmount + paymentAmount).toFixed(2));

    sale.balanceAmount = Number((sale.grandTotal - sale.paidAmount).toFixed(2));

    sale.paymentStatus = getPaymentStatus(sale.paidAmount, sale.grandTotal);

    await sale.save();

    const populatedSale = await populateSale(VehicleSale.findById(sale._id));

    return res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: populatedSale,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// COMPLETE VEHICLE SALE
exports.completeVehicleSale = async (req, res) => {
  try {
    const sale = await VehicleSale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Vehicle sale not found",
      });
    }

    if (sale.saleStatus !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft sales can be completed",
      });
    }

    const unit = await VehicleUnit.findOneAndUpdate(
      {
        _id: sale.vehicleUnit,
        stockStatus: "reserved",
      },
      { $set: { stockStatus: "sold" } },
      { new: true },
    );

    if (!unit) {
      return res.status(409).json({
        success: false,
        message: "Reserved vehicle unit not found",
      });
    }

    sale.saleStatus = "completed";
    await sale.save();

    const populatedSale = await populateSale(VehicleSale.findById(sale._id));

    return res.status(200).json({
      success: true,
      message: "Vehicle sale completed successfully",
      data: populatedSale,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// CANCEL DRAFT VEHICLE SALE
exports.cancelVehicleSale = async (req, res) => {
  try {
    const sale = await VehicleSale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Vehicle sale not found",
      });
    }

    if (sale.saleStatus !== "draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft sales can be cancelled",
      });
    }

    if (sale.paidAmount > 0) {
      return res.status(400).json({
        success: false,
        message: "Refund recorded payments before cancelling this sale",
      });
    }

    const unit = await VehicleUnit.findOneAndUpdate(
      {
        _id: sale.vehicleUnit,
        stockStatus: "reserved",
      },
      { $set: { stockStatus: "available" } },
      { new: true },
    );

    if (!unit) {
      return res.status(409).json({
        success: false,
        message: "Reserved vehicle unit not found; sale was not cancelled",
      });
    }

    sale.saleStatus = "cancelled";
    await sale.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle sale cancelled and unit released successfully",
      data: sale,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// UPDATE DELIVERY STATUS
exports.updateVehicleDeliveryStatus = async (req, res) => {
  try {
    const { deliveryStatus, deliveryDate } = req.body;

    if (!["pending", "delivered"].includes(deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: "Delivery status must be pending or delivered",
      });
    }

    const sale = await VehicleSale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Vehicle sale not found",
      });
    }

    if (sale.saleStatus !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Complete the sale before updating delivery",
      });
    }

    sale.deliveryStatus = deliveryStatus;

    if (deliveryStatus === "delivered") {
      sale.deliveryDate = deliveryDate || new Date();
    } else {
      sale.deliveryDate = null;
    }

    await sale.save();

    return res.status(200).json({
      success: true,
      message: "Vehicle delivery status updated successfully",
      data: sale,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
