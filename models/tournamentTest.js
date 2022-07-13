const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const TournamentTestSchema = new Schema({
    telegramId: String,
    username: String,
    tournament: {type: mongoose.Schema.Types.ObjectId,ref:'tournament'},
    question_id: Number,
    answer: String,
    point: Number,
    created_at: String
});

// create the model
const TournamentTestModel = mongoose.model('tournament_test', TournamentTestSchema);

// export the model
module.exports = TournamentTestModel;
