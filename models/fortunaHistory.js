const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const FortunaHistorySchema = new Schema({
    telegramId: String,
    fortuna_point: Number,
    state: Number,          //0: received by test, 1: received by tip, 2: Send, 3: withdraw to FRT token
    created_at: String,
    senderId: String,       // sender telegramId,
    senderName: String,     // sender name
    receiverId: String,     // receiver telegramId,
    receiverName: String,   // receiver name
    total_point: Number
});

// create the model
const FortunaHistoryModel = mongoose.model('fortuna_history', FortunaHistorySchema);

// export the model
module.exports = FortunaHistoryModel;
