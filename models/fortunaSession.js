const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const FortunaSessionSchema = new Schema({
    session_id: Number,
    language: String,
    type: String,
    session: String,
    each_time: Number,
    total_time: Number,
    start_time: String,
    level: String,
    questions: Number,
    session_name: String,
    status: Number,
    delivered: Number,
    randomized: Number
});

// create the model
const FortunaSessionModel = mongoose.model('fortuna_session', FortunaSessionSchema);

// export the model
module.exports = FortunaSessionModel;
