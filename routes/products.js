const { Product, validate } = require("../models/product");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const validateObjectId = require("../middleware/validateObjectId");
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
    // const ext = path.extname(file.originalname);
    cb(null, Date.now() + ".webp");
  },
});

// Set up the multer middleware with the custom storage engine
const upload = multer({ storage: storage });

router.get("/", async (req, res) => {
  const pageNumber = parseInt(req.query.page);

  if (pageNumber < 0) {
    return res.status(400).json({ error: "Page number cannot be negative." });
  }

  const products = await Product.find({ numberInStock: { $gt: 0 } })
    .select("-__v")
    .sort("createdAt")
    .populate("ratings.user")
    .limit(20)
    .skip(req.query.page * 20);

  res.send(products);
});

router.get("/top-products", async (req, res) => {
  const topProducts = await Product.find()
    .sort({ "ratings.rating": -1 }) // which has higher rating
    // .limit(10) // You can adjust the limit as per your requirement to get the top N products.
    .select("-__v")
    .populate("ratings.user");

  res.send(topProducts);
});

router.get("/trending-products", async (req, res) => {
  const trendingProducts = await Product.find()
    .sort({ soldOut: -1, createdAt: 1 })
    // .limit(10) // You can adjust the limit as per your requirement to get the top N trending products.
    .select("-__v")
    .populate("ratings.user");

  res.send(trendingProducts);
});

router.get("/title", async (req, res) => {
  if (req.query.title === "" || !req.query.title)
    return res.status(400).send([]);

  const products = await Product.find({
    $or: [
      { title: new RegExp(req.query.title, "i") },
      { description: new RegExp(req.query.title, "i") },
    ],
  });

  res.send(products);
});

router.get("/category/:category", async (req, res) => {
  console.log("this is category");
  const products = await Product.find({
    numberInStock: { $gt: 0 },
    brand: req.params.category, // Change from req.query.brand to req.params.brand
  })
    .select("-__v")
    .sort("title")
    .populate("ratings.user");

  res.send(products);
});

router.get("/brand/:brand", async (req, res) => {
  console.log("this is brand");
  const products = await Product.find({
    numberInStock: { $gt: 0 },
    brand: req.params.brand, // Change from req.query.brand to req.params.brand
  })
    .select("-__v")
    .sort("title")
    .populate("ratings.user");

  res.send(products);
});

// Route to get the calculated rating for a product

router.get("/:id", validateObjectId, async (req, res) => {
  const product = await Product.findById(req.params.id)
    .select("-__v")
    .populate({
      path: "ratings.user",
      select: "name address createdAt",
    });

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
  console.log(product.ratings);
  res.header("rating", calculatedRating).send(product);
});

router.post("/", [auth, admin, upload.array("photos", 5)], async (req, res) => {
  const { error } = validate(req.body);
  if (error) {
    console.log(error.details[0].message);
    return res.status(400).send(error.details[0].message);
  }

  if (req.files.length !== JSON.parse(req.body.forms).length) {
    console.log("Invalid product forms request body.");
    return res.status(400).send("Invalid product forms request body.");
  }

  const forms = req.files.map((file, index) => ({
    name: JSON.parse(req.body.forms)[index].name,
    image_filename: file.filename,
  }));

  try {
    const product = new Product({
      title: req.body.title,
      forms: forms,
      description: req.body.description,
      price: req.body.price,
      brand: req.body.brand,
      category: req.body.category,
      numberInStock: req.body.numberInStock,
      size: JSON.parse(req.body.size),
      color: JSON.parse(req.body.color),
    });

    await product.save();

    console.log(product);
    res.status(201).send(product); // 201 Created status for successful creation
  } catch (error) {
    console.error("Error creating product:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

router.put(
  "/:id",
  [auth, admin, upload.array("photos", 5)],
  async (req, res) => {
    const { error } = validate(req.body);
    if (error) {
      console.log(error.details[0].message);
      return res.status(400).send(error.details[0].message);
    }

    if (req.files.length !== JSON.parse(req.body.forms).length) {
      console.log("Invalid product forms request body.");
      return res.status(400).send("Invalid product forms request body.");
    }

    const forms = req.files.map((file, index) => ({
      name: JSON.parse(req.body.forms)[index].name,
      image_filename: file.filename,
    }));

    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
          title: req.body.title,
          forms: forms,
          description: req.body.description,
          price: req.body.price,
          brand: req.body.brand,
          category: req.body.category,
          numberInStock: req.body.numberInStock,
          size: JSON.parse(req.body.size),
        },
        { new: true } // To return the updated product instead of the old one
      );

      if (!product) {
        return res.status(404).send("Product not found.");
      }

      console.log(product);
      res.send(product);
    } catch (error) {
      console.error("Error updating product:", error.message);
      res.status(500).send("Internal Server Error");
    }
  }
);

router.post("/:id/rating", auth, async (req, res) => {
  const productId = req.params.id;
  const userId = req.user._id; // Assuming you have user information in req.user

  const { rating, review } = req.body;
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
    product.ratings.push({ user: userId, rating, review });
    await product.save();

    res.json({ message: "Rating added successfully." });
  } catch (error) {
    res.status(500).send("Something went wrong.");
  }
});

router.post("/:id/rating/like/:rating", auth, async (req, res) => {
  const productId = req.params.id;
  try {
    // Find the product and update the ratings
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found.");
    }

    // Update the ratings array with the new rating and user ID
    const rating = product.ratings.id(req.params.rating);
    rating.likes++;
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
