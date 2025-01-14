const orderCollection = require("../models/orderModel.js");
const formatDate = require("../service/formerDataHelper.js");
const exceljs = require("exceljs");
// const { ObjectId } = require("mongodb");

// sales report page

const salesReport = async (req, res) => {
  try {
    
    if (req.session?.admin?.salesData) {
      let { salesData, dateValues } = req.session.admin;
      return res.render("adminViews/salesReport", { salesData, dateValues });
    }

    // let page = Number(req.query.page) || 1;
    // let limit = 10;
    // let skip = (page - 1) * limit;

    // let count = await orderCollection.countDocuments({ isListed: true });

    let salesData = await orderCollection
      .find()
      .populate("userId")
      // .skip(skip)
      // .limit(limit);
    // .skip(skip).limit(limit);


    const deliveredOrders = salesData.filter(
      (order) => order.orderStatus === "Delivered"
    );

    console.log(salesData);
    res.render("adminViews/salesReport", {
      salesData: deliveredOrders,
      dateValues: null,
   
    });
  } catch (error) {
    console.error(error);
  }
};

// sales report filter

const salesReportFilter = async (req, res) => {
  try {
    let { startDate, endDate } = req.body;
    let salesDataFiltered = await orderCollection
      .find({
        orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      })
      .populate("userId");

    salesData = salesDataFiltered.map((v) => {
      v.orderDateFormatted = formatDate(v.orderDate);
      return v;
    });

    req.session.admin = {};
    req.session.admin.dateValues = req.body;
    req.session.admin.salesData = JSON.parse(JSON.stringify(salesData));
    console.log(typeof req.session.admin.salesData);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
  }
};

const salesReportDownload = async (req, res) => {
  try {
    const workBook = new exceljs.Workbook();
    const sheet = workBook.addWorksheet("book");
    sheet.columns = [
      { header: "No", key: "no", width: 10 },
      { header: "Username", key: "username", width: 25 },
      { header: "Order Date", key: "orderDate", width: 25 },
      { header: "Products", key: "products", width: 35 },
      { header: "No of items", key: "noOfItems", width: 35 },
      { header: "Total Cost", key: "totalCost", width: 25 },
      { header: "Payment Method", key: "paymentMethod", width: 25 },
      { header: "Status", key: "status", width: 20 },
    ];

    let salesData = req.session?.admin?.dateValues
      ? await orderCollection
          .find({
            orderDate: {
              $gte: new Date(req.session.admin.dateValues.startDate),
              $lte: new Date(req.session.admin.dateValues.endDate),
            },
          })
          .populate("userId")
      : await orderCollection.find().populate("userId");

    salesData = salesData.map((v) => {
      v.orderDateFormatted = formatDate(v.orderDate);
      return v;
    });
    
    const deliveredOrders = salesData.filter(order => order.orderStatus === "Delivered");

deliveredOrders.map((v) => {
  sheet.addRow({
    no: v.orderNumber,
    username: v.userId.username,
    orderDate: v.orderDateFormatted,
    products: v.cartData.map((v) => v.productId.productName).join(", "),
    noOfItems: v.cartData.map((v) => v.productQuantity).join(", "),
    totalCost: "₹" + v.grandTotalCost,
    paymentMethod: v.paymentType,
    status: v.orderStatus
  });
});

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=salesReport.xlsx"
    );

    workBook.xlsx.write(res);
  } catch (error) {
    console.log(error);
  }
};

module.exports = { salesReport, salesReportDownload, salesReportFilter };
