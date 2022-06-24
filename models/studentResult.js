const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const ResultSchema = new Schema({
    no: Number,
    username: String,
    telegramId: String,
    session: {type: mongoose.Schema.Types.ObjectId,ref:'sessions'},
    session_no: Number,
    session_points: Number,
    session_wrong_points: Number,
    session_rank: Number,
    fortuna_points: Number,
    title: String,
    sum_point: Number,
    total_fortuna_user: String,
    isMission: Number,
});

// create the model
const ResultModel = mongoose.model('results', ResultSchema);

// export the model
module.exports = ResultModel;
