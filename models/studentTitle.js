const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const TitleSchema = new Schema({
    title: String,
    limit: Number,
});

// create the model
const TitleModel = mongoose.model('student_titles', TitleSchema);

// export the model
module.exports = TitleModel;
