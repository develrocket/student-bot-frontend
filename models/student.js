const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const TitleSchema = new Schema({
    telegramId: String,
    firstName: String,
    lastName: String,
    username: String,
    motto: String
});

// create the model
const TitleModel = mongoose.model('student', TitleSchema);

// export the model
module.exports = TitleModel;
