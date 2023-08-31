const { Product, validate } = require("../models/product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");
const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../", "/uploads")); // Specify the destination folder
  },
  filename: function (req, file, cb) {
    // Preserve the original extension of the file
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

// Set up the multer middleware with the custom storage engine
const upload = multer({ storage: storage });

router.get("/", async (req, res) => {
  const products = await Product.find({ numberInStock: { $gt: 0 } })
    .select("-__v")
    .sort("title")
    .populate("ratings.user");

  res.send(products);
});

router.get("/top-products", async (req, res) => {
  const topProducts = await Product.find()
    .sort({ "ratings.rating": -1 })
    .limit(10) // You can adjust the limit as per your requirement to get the top N products.
    .select("-__v")
    .populate("ratings.user");

  res.send(topProducts);
});

router.get("/trending-products", async (req, res) => {
  const trendingProducts = await Product.find()
    .sort({ soldOut: -1 })
    .limit(10) // You can adjust the limit as per your requirement to get the top N trending products.
    .select("-__v")
    .populate("ratings.user");

  res.send(trendingProducts);
});

// Route to get the calculated rating for a produc

router.get("/:id", validateObjectId, async (req, res) => {
  const product = await Product.findById(req.params.id)
    .select("-__v")
    .populate("ratings.user");
  if (!product)
    return res.status(404).send("The product with the given ID was not found.");
  // Calculate the weighted average rating
  let totalRating = 0;
  let totalWeight = 0;

  product.ratings.forEach((ratingObj) => {
    totalRating += ratingObj.rating;
    totalWeight++;
  });

  const calculatedRating = totalRating / totalWeight;

  res.send(product);
});

// router.put("/:id", [auth], async (req, res) => {
//   const { error } = validate(req.body);
//   if (error) return res.status(400).send(error.details[0].message);

//   const product = await Product.findByIdAndUpdate(
//     req.params.id,
//     {
//       title: req.body.title,
//       forms: req.body.forms,
//       numberInStock: req.body.numberInStock,
//       dailyRentalRate: req.body.dailyRentalRate
//     },
//     { new: true }
//   );

//   if (!product)
//     return res.status(404).send("The product with the given ID was not found.");

//   res.send(product);
// });

router.post("/", [auth, upload.array("photos", 5)], async (req, res) => {
  console.log(req.files);
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  if (req.files.length != JSON.parse(req.body.forms).length)
    return res.status("invalid product forms request body.");

  const forms = req.files.map((file, index) => {
    return {
      name: JSON.parse(req.body.forms)[index].name,
      image_filename: file.filename,
    };
  });

  console.log(forms, req.body);

  const product = new Product({
    title: req.body.title,
    forms: forms,
    description: req.body.description,
    price: req.body.price,
    brand: req.body.brand,
    category: req.body.category,
    numberInStock: req.body.numberInStock,
  });

  await product.save();

  res.send(product);
});

router.post("/:id/rating", auth, async (req, res) => {
  const productId = req.params.id;
  const userId = req.user._id; // Assuming you have user information in req.user

  const { rating } = req.body;
  console.log(rating, req.body.rating, req.body);
  if (!rating || rating < 1 || rating > 5) {
    return res
      .status(400)
      .send("Invalid rating. Rating should be between 1 and 5.");
  }

  try {
    // Find the product and update the ratings
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found.");
    }

    // Update the ratings array with the new rating and user ID
    product.ratings.push({ user: userId, rating });
    await product.save();

    res.json({ message: "Rating added successfully." });
  } catch (error) {
    res.status(500).send("Something went wrong.");
  }
});

router.delete("/:id", [auth, admin], async (req, res) => {
  const product = await Product.findByIdAndRemove(req.params.id);

  if (!product)
    return res.status(404).send("The product with the given ID was not found.");

  res.send(product);
});

module.exports = router;
