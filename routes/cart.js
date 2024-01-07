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

  // Check if the item with the same product_id, form, and size already exists
  const existingItemIndex = user.cart.findIndex((item) => {
    return (
      item._id == req.body.product_id &&
      item.selectedForm == (req.body.form || 0) &&
      item.selectedSize == (req.body.size || 0)
    );
  });

  if (existingItemIndex !== -1) {
    // If the item exists, update the quantity
    user.cart[existingItemIndex].quantity += 1;
  } else {
    // If the item doesn't exist, add it to the cart
    const obj = {
      ...product._doc,
      selectedForm: req.body.form,
      selectedSize: req.body.size,
      quantity: req.body.quantity,
    };
    user.cart.push(obj);
  }

  await user.save();
  res.send(user.cart);
});
router.put("/decrement/:itemId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    console.log("Item ID from params:", req.params.itemId);
    console.log("req.params is", req.params.itemId);
    console.log("User's Cart:", user.cart);
    console.log("user id is", req.user._id);

    // Find the index of the item in the cart
    const itemIndex = user.cart.findIndex((item) => {
      console.log(
        req.params.itemId,
        item._id.toString(), // Convert to string
        item._id.toString() === req.params.itemId,
        typeof req.params.itemId,
        typeof item._id
      );
      return item._id.toString() === req.params.itemId;
    });

    if (itemIndex !== -1) {
      // If the item exists in the cart
      if (user.cart[itemIndex].quantity > 1) {
        // If the quantity is greater than 1, decrement it
        user.cart[itemIndex].quantity -= 1;
      } else {
        // If the quantity is 1, remove the item from the cart
        user.cart.splice(itemIndex, 1);
      }

      await user.save();
      res.send(user.cart);
    } else {
      console.log("item index is", itemIndex);
      // If the item is not found in the cart
      res.status(404).send("Item not found in the cart");
    }
  } catch (error) {
    console.error("Error decrementing item quantity:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
