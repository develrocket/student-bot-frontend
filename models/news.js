const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const NewsSchema = new Schema({
    content: String,
    status: Number //0: Session Open, 1: Ongoing, 2: Close
}, {
    timestamps: true
});

// create the model
const NewsModel = mongoose.model('news', NewsSchema);

// export the model
module.exports = NewsModel;
