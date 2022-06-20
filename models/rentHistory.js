const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const RentHistorySchema = new Schema({
    telegramId: String,
    person: {type: mongoose.Schema.Types.ObjectId,ref:'great_person'},
    mission: {type: mongoose.Schema.Types.ObjectId,ref:'mission'},
    amount: Number
}, {
    timestamps: true
});

// create the model
const RentHistoryModel = mongoose.model('rent_history', RentHistorySchema);

// export the model
module.exports = RentHistoryModel;
