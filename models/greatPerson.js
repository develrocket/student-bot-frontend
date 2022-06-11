const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const GreatPersonSchema = new Schema({
    name: String,
    icon: String,
    field: String,
    price: String,
    status: Number, //1: In Loop, 2: In Market
});

// create the model
const GreatPersonModel = mongoose.model('great_person', GreatPersonSchema);

// export the model
module.exports = GreatPersonModel;
