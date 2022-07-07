const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const TournamentHistorySchema = new Schema({
    telegramId: String,
    username: String,
    tournament: {type: mongoose.Schema.Types.ObjectId,ref:'tournament'},
    created_at: String,
    isNoti: Number,
    isEnd: Number
});

// create the model
const TournamentHistoryModel = mongoose.model('tournament_history', TournamentHistorySchema);

// export the model
module.exports = TournamentHistoryModel;
