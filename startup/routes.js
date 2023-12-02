const express = require("express");
const analytics = require("../routes/analytics");
const products = require("../routes/products");
const orders = require("../routes/orders");
const users = require("../routes/users");
const cart = require("../routes/cart");
const auth = require("../routes/auth");
const checkout = require("../routes/checkout");
const error = require("../middleware/error");

module.exports = function (app) {
  app.use(express.json());
  app.use(express.static("./uploads"));
  app.use("/api/analytics", analytics);
  app.use("/api/products", products);
  app.use("/api/orders", orders);
  app.use("/api/users", users);
  app.use("/api/cart", cart);
  app.use("/api/auth", auth);
  app.use("/api/checkout", checkout);
  app.use(error);
};
