const { User } = require("../models/user");
const { Product } = require("../models/product");
const auth = require("../middleware/auth");
const express = require("express");
const router = express.Router();

// Route for admin to view orders with status other than "delivered"
router.get("/orders", [auth], async (req, res) => {
  try {
    const orders = await User.aggregate([
      { $unwind: "$orders" },
      {
        $match: {
          "orders.status": { $ne: "delivered" },
          "orders.cancelled": { $ne: true },
        },
      },
      {
        $lookup: {
          from: "products", // Replace with the actual name of your products collection
          localField: "orders.product",
          foreignField: "_id",
          as: "orders.product",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            _id: "$orders._id",
            status: "$orders.status",
            totalAmount: "$orders.totalAmount",
            quantity: "$orders.quantity",
            size : "$orders.size",
            payment_method: "$orders.payment_method",
           product :  { $arrayElemAt: ["$orders.product", 0] }
          },
        },
      },
    ]);

    console.log(orders);

    res.send(orders);
  } catch (error) {
    res.status(500).send("Something went wrong.");
  }
});

// Route for admin to view top-selling products
router.get("/top-selling-products", [auth], async (req, res) => {
  try {
    const topSellingProducts = await User.aggregate([
      { $unwind: "$orders" },
      { $unwind: "$orders.products" },
      {
        $group: {
          _id: "$orders.products.title",
          totalQuantitySold: { $sum: "$orders.quantity" },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 10 }, // You can change the limit as per your requirement
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "title",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          _id: "$productInfo._id",
          title: "$productInfo.title",
          totalQuantitySold: 1,
        },
      },
    ]);

    res.send(topSellingProducts);
  } catch (error) {
    res.status(500).send("Something went wrong.");
  }
});
router.get("/annual-sales-revenue", async (req, res) => {
  try {
    const annualSalesRevenue = await User.aggregate([
      { $unwind: "$orders" },
      {
        $group: {
          _id: {
            year: { $year: "$orders.createdAt" }, // Extract the year from the createdAt field
          },
          totalRevenue: { $sum: "$orders.totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          totalRevenue: 1,
        },
      },
    ]);

    res.send(
      annualSalesRevenue.length > 0
        ? annualSalesRevenue[0]
        : { totalRevenue: 0 }
    );
  } catch (error) {
    res.status(500).send("Something went wrong.");
  }
});
router.get("/monthly-sales-revenue", async (req, res) => {
  try {
    const monthlySalesRevenue = await User.aggregate([
      { $unwind: "$orders" },
      {
        $group: {
          _id: {
            year: {
              $dateToString: { format: "%Y", date: "$orders.createdAt" },
            },
            month: {
              $dateToString: { format: "%m", date: "$orders.createdAt" },
            },
          },
          totalRevenue: { $sum: "$orders.totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          totalRevenue: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    res.send(monthlySalesRevenue);
  } catch (error) {
    res.status(500).send("Something went wrong.");
  }
});
// Route for admin to view best-rated products
router.get("/best-products", [auth], async (req, res) => {
  try {
    const bestProducts = await Product.aggregate([
      { $unwind: "$ratings" },
      { $match: { "ratings.rating": { $gte: 4 } } },
      { $sort: { "ratings.rating": -1 } },
      { $limit: 10 }, // You can change the limit as per your requirement
      {
        $project: {
          _id: 1,
          title: 1,
          rating: "$ratings.rating",
        },
      },
    ]);

    res.send(bestProducts);
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong.");
  }
});

module.exports = router;
