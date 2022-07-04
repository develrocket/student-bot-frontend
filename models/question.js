const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const QuestionSchema = new Schema({
    question_id: Number,
    sessionID: Number,
    username: String,
    question: String,
    answer1: String,
    language: String,
    bot: Number,
    level: String,
    file: String,
    user_id: Number,
    edited_by: Number,
    validated: Number,
    validated_by: String,
    validated_at: String,
    answer2: String,
    answer3: String,
    answer4: String,
    session1: String,
    module: Number,
    lesson: String
});

// create the model
const QuestionModel = mongoose.model('question', QuestionSchema);

// export the model
module.exports = QuestionModel;
