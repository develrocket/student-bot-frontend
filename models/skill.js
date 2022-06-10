const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const SkillSchema = new Schema({
    name: String,
});

// create the model
const SkillModel = mongoose.model('skill', SkillSchema);

// export the model
module.exports = SkillModel;
