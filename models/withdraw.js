const mongoose = require('mongoose');

const { Schema } = mongoose;

// create a schema
const WithdrawSchema = new Schema({
    telegramId: String,
    amount: Number,
    status: Number
}, {
    timestamps: true
});

// create the model
const WithdrawModel = mongoose.model('withdraw', WithdrawSchema);

// export the model
module.exports = WithdrawModel;
