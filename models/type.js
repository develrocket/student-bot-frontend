const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const TypeSchema = new Schema({
    type: String,
    test_time: Number,
    question_time: Number
});

// create the model
const TypeModel = mongoose.model('type', TypeSchema);

// export the model
module.exports = TypeModel;
