const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const FortunaHistorySchema = new Schema({
    telegramId: String,
    fortuna_point: Number,
    session_no: String,
    state: Number,          //0: received by test, 1: received by tip, 2: Send, 3: withdraw to FRT token, 4: Rent Great Person, 5: Buy Offer, 6: Sell Offer, 7: Complete mission
    created_at: String,
    senderId: String,       // sender telegramId,
    senderName: String,     // sender name
    receiverId: String,     // receiver telegramId,
    receiverName: String,   // receiver name
    walletAddr: String,
    total_point: Number,
    person: {type: mongoose.Schema.Types.ObjectId,ref:'great_person'},
    mission: {type: mongoose.Schema.Types.ObjectId,ref:'mission'},
    offer: {type: mongoose.Schema.Types.ObjectId,ref:'offer'}
});

// create the model
const FortunaHistoryModel = mongoose.model('fortuna_history', FortunaHistorySchema);

// export the model
module.exports = FortunaHistoryModel;
