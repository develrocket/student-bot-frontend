const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const FortunaSessionSchema = new Schema({
    session_id: String,
    language: String,
    session: String,
    level: String,
    questions: Number,
});

// create the model
const FortunaSessionModel = mongoose.model('fortuna_session', FortunaSessionSchema);

// export the model
module.exports = FortunaSessionModel;
