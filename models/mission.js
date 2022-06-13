const mongoose = require('mongoose');

const {Schema} = mongoose;

// create a schema
const MissionSchema = new Schema({
    name: String,
    banner: String,
    description: String,
    badge: String,
    person: {type: mongoose.Schema.Types.ObjectId,ref:'great_person'},
    skills: [{
        skill: String,
        amount: Number
    }],
    price: Number,
    start_at: String,
    end_at: String,
    status: Number
}, {
    timestamps: true
});

// create the model
const MissionModel = mongoose.model('mission', MissionSchema);

// export the model
module.exports = MissionModel;
