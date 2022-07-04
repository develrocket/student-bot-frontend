const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const LevelSchema = new Schema({
    name: String,
    points: Number,
    bottext: String
});

// create the model
const LevelModel = mongoose.model('level', LevelSchema);

// export the model
module.exports = LevelModel;
