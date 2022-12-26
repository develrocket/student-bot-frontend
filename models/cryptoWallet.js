const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const CryptoWallet = new Schema({
    cust_no: String,
    account_id: String,
    type: String,
    name: String,
    address: String,
    secret: String,
    balance: String,
    big_address: String,
    password: String
}, {
    timestamps: true
});

// create the model
const CryptoUserModel = mongoose.model('crypto_wallets', CryptoWallet);

// export the model
module.exports = CryptoUserModel;
