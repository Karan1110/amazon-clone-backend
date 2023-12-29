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
        $project: {
          "orders._id": 1,
          "orders.products": 1,
          "orders.totalAmount": 1,
          "orders.status": 1,
        },
      },
    ]);

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
