const { validate } = require("../models/order");
const { Product } = require("../models/product");
const { User } = require("../models/user");
const auth = require("../middleware/auth");
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const config = require("config");

router.post("/", auth, async (req, res) => {
  const product = await Product.findById(req.body.product_id);

  const user = await User.findById(req.user._id);
  const obj = {
    ...product._doc,
    selectedForm: req.body.form,
    selectedSize: req.body.size,
    quantity : req.body.quantity
  };
  user.cart.push(obj);

  console.log(req.body, obj, product.title);

  await user.save();
  console.log(user.cart);
  res.send(user.cart);
});

module.exports = router;
