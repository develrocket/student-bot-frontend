const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const TitleSchema = new Schema({
    telegramId: String,
    fullName: String,
    userId: String
});

// create the model
const TitleModel = mongoose.model('student', TitleSchema);

// export the model
module.exports = TitleModel;
