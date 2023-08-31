const Joi = require("joi");
const mongoose = require("mongoose");

const productFormSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  image_filename: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
});

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 255,
  },
  description: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 2000,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  forms: [productFormSchema], // Array of objects for different forms
  size: [String], // Array of objects for different forms
  ratings: [
    {
      user: {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
      rating: {
        type: Number,
        validate: {
          validator: function (rating) {
            if (rating > 5) {
              throw new Error("Rating has a limit of 5.");
            }
            return true;
          },
        },
      },
    },
  ],
  brand: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  numberInStock: {
    type: Number,
    required: true,
    min: 0,
    max: 255,
  },
  soldOut: {
    type: Number,
    default: 0,
  },
});

const Product = mongoose.model("Product", productSchema);

function validateProduct(product) {
  const schema = {
    title: Joi.string().min(5).max(255).required(),
    description: Joi.string().min(10).max(2000).required(),
    price: Joi.number().min(0).required(),
    forms: Joi.array().items(
      Joi.object({
        name: Joi.string().min(2).max(50).required(),
      })
    ),
    photos: Joi.array(),
    brand: Joi.string().min(2).max(50).required(),
    category: Joi.string().min(2).max(50).required(),
    numberInStock: Joi.number().min(0).required(),
  };

  return Joi.validate(product, schema);
}

exports.mongoose = mongoose;
exports.Product = Product;
exports.productSchema = productSchema;
exports.validate = validateProduct;
