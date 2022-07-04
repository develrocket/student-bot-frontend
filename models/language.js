const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const LanguageSchema = new Schema({
    name: String,
    isDeleted: Number
});

// create the model
const LanguageModel = mongoose.model('language', LanguageSchema);

// export the model
module.exports = LanguageModel;
