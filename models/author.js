const mongoose = require('mongoose')

const authorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false
    }
})

module.exports = mongoose.model('Author', authorSchema)