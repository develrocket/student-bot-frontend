const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const MissionHistorySchema = new Schema({
    telegramId: String,
    username: String,
    mission: {type: mongoose.Schema.Types.ObjectId,ref:'mission'},
    created_at: String,
    isNoti: Number
});

// create the model
const MissionHistoryModel = mongoose.model('mission_history', MissionHistorySchema);

// export the model
module.exports = MissionHistoryModel;
