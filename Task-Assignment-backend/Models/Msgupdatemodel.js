const mongoose = require('mongoose');

const updatemsg = mongoose.Schema({
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    To: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Groups' },
    msg: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('msgUpdates', updatemsg)