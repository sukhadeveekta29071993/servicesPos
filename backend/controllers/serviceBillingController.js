const mongoose = require("mongoose");

const JobCard = require("../models/JobCard");
const ServiceTask = require("../models/ServiceTask");
const ServicePartConsumption = require("../models/ServicePartConsumption");
const ServiceInvoice = require("../models/ServiceInvoice");
const Payment = require("../models/Payment");

// Common error handler
const handleError = (res, error) => {
  console.error("Service Billing Error:", error);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate invoice or payment number / record already exists",
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
    error: error.message,
  });
};

// 1. Create Service Invoice
exports.createServiceInvoice = async (req, res) => {
  try {
    const { jobCardId, dueDate, notes } = req.body;

    if (!mongoose.isValidObjectId(jobCardId)) {
      return res.status(400).json({
        success: false,
        message: "Valid job card ID is required",
      });
    }

    const jobCard = await JobCard.findById(jobCardId);

    if (!jobCard) {
      return res.status(404).json({
        success: false,
        message: "Job card not found",
      });
    }

    const existingInvoice = await ServiceInvoice.findOne({
      jobCard: jobCard._id,
    });

    if (existingInvoice) {
      return res.status(409).json({
        success: false,
        message: "Invoice already exists for this job card",
        data: existingInvoice,
      });
    }

    // Get consumed parts
    const consumptions = await ServicePartConsumption.find({
      jobCard: jobCard._id,
    });

    // Get completed service tasks
    const serviceTasks = await ServiceTask.find({
      jobCard: jobCard._id,
      taskStatus: "completed",
    });

    const items = [];

    let partsAmount = 0;
    let labourAmount = 0;
    let otherAmount = 0;
    let totalDiscount = 0;
    let totalTaxableAmount = 0;
    let totalGstAmount = 0;

    // Add parts to invoice
    for (const part of consumptions) {
      const grossAmount = part.quantity * part.unitPrice;
      const taxableAmount = part.taxableAmount;
      const gstAmount = part.gstAmount || 0;
      const totalAmount = part.totalAmount;

      partsAmount += grossAmount;
      totalDiscount += part.discount || 0;
      totalTaxableAmount += taxableAmount;
      totalGstAmount += gstAmount;

      items.push({
        itemType: "part",
        product: part.product,
        description: `Service Part - ${part.product}`,
        quantity: part.quantity,
        unitPrice: part.unitPrice,
        discount: part.discount || 0,
        gstRate: part.gstRate || 0,
        taxableAmount,
        gstAmount,
        totalAmount,
      });
    }

    // Add labour tasks to invoice
    for (const task of serviceTasks) {
      const grossAmount = task.labourCharge || 0;
      const discount = task.discount || 0;
      const taxableAmount = Math.max(0, grossAmount - discount);
      const gstRate = task.gstRate || 0;
      const gstAmount = (taxableAmount * gstRate) / 100;
      const totalAmount = taxableAmount + gstAmount;

      labourAmount += grossAmount;
      totalDiscount += discount;
      totalTaxableAmount += taxableAmount;
      totalGstAmount += gstAmount;

      items.push({
        itemType: "labour",
        serviceTask: task._id,
        description: task.taskName,
        quantity: 1,
        unitPrice: grossAmount,
        discount,
        gstRate,
        taxableAmount,
        gstAmount,
        totalAmount,
      });
    }

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No consumed parts or completed labour tasks found",
      });
    }

    const subTotal = partsAmount + labourAmount + otherAmount;
    const grandTotal = totalTaxableAmount + totalGstAmount;

    const invoice = await ServiceInvoice.create({
      invoiceNumber: `SINV-${Date.now()}`,
      jobCard: jobCard._id,
      customer: jobCard.customer,
      vehicle: jobCard.vehicle,
      dueDate: dueDate || null,
      items,
      partsAmount,
      labourAmount,
      otherAmount,
      subTotal,
      discount: totalDiscount,
      taxableAmount: totalTaxableAmount,
      gstAmount: totalGstAmount,
      grandTotal,
      paidAmount: 0,
      balanceAmount: grandTotal,
      paymentStatus: "unpaid",
      invoiceStatus: "draft",
      notes: notes || "",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Service invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 2. Get All Service Invoices
exports.getAllServiceInvoices = async (req, res) => {
  try {
    const invoices = await ServiceInvoice.find()
      .populate("customer")
      .populate("vehicle")
      .populate("jobCard")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 3. Get Service Invoice By ID
exports.getServiceInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const invoice = await ServiceInvoice.findById(id)
      .populate("customer")
      .populate("vehicle")
      .populate("jobCard")
      .populate("createdBy", "name email");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Service invoice not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 4. Get Invoice By Job Card
exports.getInvoiceByJobCard = async (req, res) => {
  try {
    const { jobCardId } = req.params;

    if (!mongoose.isValidObjectId(jobCardId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job card ID",
      });
    }

    const invoice = await ServiceInvoice.findOne({
      jobCard: jobCardId,
    })
      .populate("customer")
      .populate("vehicle")
      .populate("jobCard");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found for this job card",
      });
    }

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 5. Add Payment
exports.addPayment = async (req, res) => {
  try {
    const {
      serviceInvoiceId,
      amount,
      paymentMethod,
      transactionReference,
      paymentDate,
      notes,
    } = req.body;

    if (!mongoose.isValidObjectId(serviceInvoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Valid service invoice ID is required",
      });
    }

    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid payment amount is required",
      });
    }

    const invoice = await ServiceInvoice.findById(serviceInvoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Service invoice not found",
      });
    }

    if (invoice.invoiceStatus !== "issued") {
      return res.status(400).json({
        success: false,
        message: "Payment is allowed only for issued invoices",
      });
    }

    if (Number(amount) > invoice.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount cannot exceed invoice balance",
      });
    }

    const payment = await Payment.create({
      paymentNumber: `PAY-${Date.now()}`,
      serviceInvoice: invoice._id,
      amount: Number(amount),
      paymentMethod,
      transactionReference: transactionReference || "",
      paymentDate: paymentDate || Date.now(),
      paymentStatus: "completed",
      notes: notes || "",
      receivedBy: req.user._id,
    });

    // Update invoice payment summary
    const updatedInvoice = await ServiceInvoice.findOneAndUpdate(
      {
        _id: invoice._id,
        invoiceStatus: "issued",
        balanceAmount: { $gte: Number(amount) },
      },
      {
        $inc: {
          paidAmount: Number(amount),
          balanceAmount: -Number(amount),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedInvoice) {
      await Payment.findByIdAndDelete(payment._id);

      return res.status(409).json({
        success: false,
        message: "Invoice balance changed. Please retry payment",
      });
    }

    updatedInvoice.paymentStatus =
      updatedInvoice.balanceAmount === 0 ? "paid" : "partially_paid";

    await updatedInvoice.save();

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment,
        invoice: updatedInvoice,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 6. Get All Payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("serviceInvoice")
      .populate("receivedBy", "name email")
      .sort({ paymentDate: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 7. Get Payments By Invoice
exports.getPaymentsByInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    if (!mongoose.isValidObjectId(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID",
      });
    }

    const payments = await Payment.find({
      serviceInvoice: invoiceId,
    })
      .populate("receivedBy", "name email")
      .sort({ paymentDate: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 8. Get Payment By ID
exports.getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
      });
    }

    const payment = await Payment.findById(id)
      .populate("serviceInvoice")
      .populate("receivedBy", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
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
