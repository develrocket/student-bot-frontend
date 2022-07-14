const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const TournamentWinHistorySchema = new Schema({
    telegramId: String,
    username: String,
    tournament: {type: mongoose.Schema.Types.ObjectId,ref:'tournament'},
    created_at: String,
    level: Number,
    badge: String,
    gain: Number
});

// create the model
const TournamentWinHistoryModel = mongoose.model('tournament_win_history', TournamentWinHistorySchema);

// export the model
module.exports = TournamentWinHistoryModel;
