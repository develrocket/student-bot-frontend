const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const TournamentSchema = new Schema({
    name: String,
    price: Number,
    start_at: String,
    end_at: String,
    banner: String,
    award_1: String,
    award_2: String,
    award_3: String,
    gains_1: Number,
    gains_2: Number,
    gains_3: Number,
    qualifier: {
        start: String,
        open: Number,
        qualified: Number,
        language: String,
        exec_type: String,
        level: String,
        session: String
    },
    quarterfinal: {
        start: String,
        language: String,
        exec_type: String,
        level: String,
        session: String,
        qualified: Number
    },
    semifinal: {
        start: String,
        language: String,
        exec_type: String,
        level: String,
        session: String,
        qualified: Number
    },
    final: {
        start: String,
        language: String,
        exec_type: String,
        level: String,
        session: String
    },
    status: Number          //1: Pending 2: Ongoing, 3: Finished, 4: Hide
});

// create the model
const TournamentModel = mongoose.model('tournament', TournamentSchema);

// export the model
module.exports = TournamentModel;
