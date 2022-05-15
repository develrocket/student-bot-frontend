const mongoose = require('mongoose');

const { Schema } = mongoose;

// create a schema
const SessionSchema = new Schema({
    no: Number,
    language: String,
    session_type: String,
    session_name: String,
    session_no: Number,
    session_start: Date,
    questions_no: Number,
    students_no: Number,
});

// create the model
const SessionModel = mongoose.model('sessions', SessionSchema);

// export the model
module.exports = SessionModel;
