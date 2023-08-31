const Joi = require("joi");
const mongoose = require("mongoose");

function validateOrder(order) {
  const schema = {
    product_id: Joi.objectId().required(),
    quantity: Joi.number().min(1).required(),
    payment_method: Joi.required(),
    form: Joi.required(),
    size: Joi.required(),
  };

  return Joi.validate(order, schema);
}
exports.validate = validateOrder;
