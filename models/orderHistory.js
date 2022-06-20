const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const OrderHistorySchema = new Schema({
    telegramId: String,
    username: String,
    offer: {type: mongoose.Schema.Types.ObjectId,ref:'offer'},
    amount: Number,
    price: Number,
    total: Number
}, {
    timestamps: true
});

// create the model
const OrderHistoryModel = mongoose.model('order_history', OrderHistorySchema);

// export the model
module.exports = OrderHistoryModel;
