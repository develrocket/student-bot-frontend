const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const SkillHistorySchema = new Schema({
    telegramId: String,
    skill: String,
    score: Number,
    session_no: Number,
    mission: {type: mongoose.Schema.Types.ObjectId,ref:'mission'},
    offer: {type: mongoose.Schema.Types.ObjectId,ref:'offer'},
}, {
    timestamps: true
});

// create the model
const SkillHistoryModel = mongoose.model('skill_history', SkillHistorySchema);

// export the model
module.exports = SkillHistoryModel;
