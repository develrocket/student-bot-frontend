const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const StudentPointHistorySchema = new Schema({
    telegramId: String,
    point: Number,
    created_at: String,
    session_no: Number
});

// create the model
const StudentPointHistoryModel = mongoose.model('student_point', StudentPointHistorySchema);

// export the model
module.exports = StudentPointHistoryModel;
