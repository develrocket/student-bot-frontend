const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const TournamentHistorySchema = new Schema({
    telegramId: String,
    username: String,
	fullname: String,
    tournament: {type: mongoose.Schema.Types.ObjectId,ref:'tournament'},
    created_at: String,
    finished_at: String,
    isNoti: Number,
    isEnd: Number,
    level: Number,
    score: Number
});

// create the model
const TournamentHistoryModel = mongoose.model('tournament_history', TournamentHistorySchema);

// export the model
module.exports = TournamentHistoryModel;
