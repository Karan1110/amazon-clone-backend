const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { User } = require("../models/user");
const mongoose = require("mongoose");
const stripe = require("stripe")(
  "sk_test_51NWGwmSFQRFknQs0SBq5aVnv5wvaRHcdaioN49UbtL7UFwAYm1UYTPrKYsgTJS4pvknqz3zc09slUz6IjbkltTAp007zrNdZkW"
);

router.post("/cart", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    console.log(user);
    const cart = user.cart;
    console.log(cart);

    if (!cart || cart.length === 0) {
      return res.status(400).send("The cart is empty!");
    }

    let totalAmount = 0;
    const ordersToAdd = [];

    cart.forEach((cart_item) => {
      totalAmount = cart_item.price + totalAmount;

      // Creating an order object for each product in the cart
      const order = {
        _id: new mongoose.Types.ObjectId(),
        product: cart_item._id,
        totalAmount: cart_item.price,
        status: "pending",
        payment_method: req.body.payment_method,
        quantity: req.body.quantity, // You may need to adjust this based on the quantity in the cart
        form: cart_item.selectedForm,
        size: cart_item.selectedSize,
      };

      ordersToAdd.push(order);
    });

    const lineItems = cart.map((item) => {
      const unitAmountInPaise = totalAmount * 100; // Make sure this is correctly calculated

      return {
        price_data: {
          currency: "inr",
          unit_amount: unitAmountInPaise,
          product_data: {
            name: item.title,
          },
        },
        quantity: 1, // Assuming you want to order one unit of each item in the cart
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `http://localhost:3000/success`,
      cancel_url: `http://localhost:3000/failed`,
    });

    // Add orders to the user's orders subdocument
    user.orders.push(...ordersToAdd);

    // Clear the cart after creating orders
    user.cart = [];

    await user.save();

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/:id", auth, async (req, res) => {
  try {
    console.log(req.params.id);

    const user = await User.findById(req.user._id).populate("orders.product");
    const order = user.orders.id(req.params.id);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: order.product.title,
            },
            unit_amount: order.totalAmount * 100,
          },
          quantity: order.quantity,
        },
      ],
      success_url: `http://localhost:3000/success`,
      cancel_url: `http://localhost:3000/failed`,
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
