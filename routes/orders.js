const { validate } = require("../models/order");
const { Product } = require("../models/product");
const { User } = require("../models/user");
const auth = require("../middleware/auth");
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const config = require("config");

router.post("/", auth, async (req, res) => {
  const session = await mongoose.startSession();
  console.log(req.body);
  // Flag to keep track of whether the transaction has been aborted or not
  let isTransactionAborted = false;

  try {
    await session.withTransaction(async () => {
      const { error } = validate(req.body);
      if (error) {
        throw new Error(error.details[0].message);
      }

      const user = await User.findById(req.user._id).session(session);
      if (!user) {
        throw new Error("Invalid user.");
      }

      const product = await Product.findById(req.body.product_id).session(
        session
      );
      if (!product) {
        throw new Error("Invalid product.");
      }

      let totalAmount = product.price * req.body.quantity;
      console.log(product);

      let order = {
        _id: new mongoose.Types.ObjectId(),
        product: req.body.product_id,
        totalAmount: totalAmount,
        status: "pending",
        payment_method: req.body.payment_method,
        quantity: req.body.quantity,
        form: product.forms[req.body.form].name,
        size: product.size[req.body.size],
      };

      console.log(order);
      user.orders.push(order);
      await user.save();

      // Update product data with the new quantities
      product.soldOut += req.body.quantity;
      product.numberInStock -= req.body.quantity;

      // Save the productData using save() with the session
      await product.save({ session });
      res.send(user.orders.id(order._id));
    });
  } catch (ex) {
    console.error(ex.message, ex);

    // If an error occurred, set the flag to true to indicate that the transaction is already aborted
    isTransactionAborted = true;

    // If the transaction has not been previously aborted, abort it now
    if (!isTransactionAborted) {
      await session.abortTransaction();
    }

    res.status(500).send("Something failed.");
  } finally {
    // If the transaction has not been previously aborted, end the session
    if (!isTransactionAborted) {
      session.endSession();
    }
  }
});

router.get("/", auth, async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-__v")
    .sort("-createdAt")
    .populate("orders.product");
  res.send(user.orders);
});

router.get("/:id", [auth], async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-__v")
    .populate("orders.product")
    .sort("-createdAt");

  if (!user)
    return res.status(404).send("The order with the given ID was not found.");

  const order = user.orders.id(req.params.id);

  if (!order)
    return res.status(404).send("The order with the given ID was not found.");

  res.send(order);
});

module.exports = router;
