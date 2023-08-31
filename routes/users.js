const auth = require("../middleware/auth");
const bcrypt = require("bcrypt");
const _ = require("lodash");
const { User, validate } = require("../models/user");
const express = require("express");
const router = express.Router();

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.send(user);
});

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) {
    console.log(error);
    return res.status(400).send(error.details[0].message);
  }

  let user = await User.findOne({ email: req.body.email });
  if (user) {
    console.log(user);
    return res.status(400).send("User already registered.");
  }

  const pinCode = req.body.pinCode;
  if (!pinCode) {
    console.log("msg");
    return res.status(400).send("Pin code is required.");
  }

  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pinCode}`
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .send("Error fetching address information.");
    }

    const data = await response.json();
    if (
      !data ||
      data.length === 0 ||
      !data[0].PostOffice ||
      data[0].PostOffice.length === 0
    ) {
      return res
        .status(404)
        .send("Address not found for the provided pin code.");
    }

    const postOffice = data[0].PostOffice[0]; // Use the first post office address

    user = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      address: {
        street: postOffice.Name,
        city: postOffice.Block,
        state: postOffice.State,
        pinCode: postOffice.Pincode,
      },
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);

    const token = user.generateAuthToken();
    await user.save();
    res.header("x-auth-token", token).send({
      _id: user._id,
      name: user.name,
      email: user.email,
      address: user.address,
      token: token,
    });
  } catch (error) {
    res.status(500).send("Something went wrong.");
  }
});

module.exports = router;
