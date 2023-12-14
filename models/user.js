const config = require("config");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const mongoose = require("mongoose");
const { productSchema } = require("./product");

const orderSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Types.ObjectId,
      ref: "Product",
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered"],
      default: "pending",
    },
    quantity: Number,
    form: {
      type: String,
    },
    size: {
      type: String,
    },
    payment_method: {
      type: String,
      enum: ["card", "cash"],
      default: "card",
    },
  },
  {
    timestamps: true,
  }
);
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

// const productSchema =;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1024,
  },
  address: {
    street: String,
    city: String,
    state: String,
    pinCode: String,
  },
  isAdmin: Boolean,
  cart: [
    new mongoose.Schema({
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
      selectedForm: Number,
      selectedSize: Number,
      quantity : {
        type : Number,
        default: 1,
        max : 100,
        min : 1
      }
    }),
  ],
  orders: [orderSchema],
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      email: this.email,
      isAdmin: this.isAdmin,
    },
    config.get("jwtPrivateKey")
  );
  return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {
  const schema = {
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().min(5).max(255).required().email(),
    password: Joi.string().min(5).max(255).required(),
    pinCode: Joi.number().required(),
  };

  return Joi.validate(user, schema);
}

exports.User = User;
exports.userSchema = userSchema;
exports.validate = validateUser;
