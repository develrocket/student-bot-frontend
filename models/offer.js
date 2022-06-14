const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const OfferSchema = new Schema({
    telegramId: String,
    username: String,
    skill: String,
    price: String,
    amount: String,
    status: Number
}, {
    timestamps: true
});

// create the model
const OfferModel = mongoose.model('offer', OfferSchema);

// export the model
module.exports = OfferModel;
