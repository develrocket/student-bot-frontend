const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const CryptoUser = new Schema({
    cust_no: String,
    account_id: String
}, {
    timestamps: true
});

// create the model
const CryptoUserModel = mongoose.model('crypto_users', CryptoUser);

// export the model
module.exports = CryptoUserModel;
