const mongoose = require('mongoose')
const marked = require('marked') // Converts markdown markup to html
const slugify = require('slugify') // Converts article's title to friendly url

const createDomPurify = require('dompurify') // sanitize the html from textarea
const { JSDOM } = require('jsdom') // module for 'dompurify'
const dompurify = createDomPurify(new JSDOM().window) // this allows as to create an html and purify it using JSDOM().window object

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    markdown: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
        // default: () => Date.now()
    },
    slug: {
        type: String,
        require: true,
        unique: true // force to have only inique values
    },
    sanitizedHtml: {
        type: String,
        required: true
    }
})

// The callback function runs every time when ever we save, update, create, delete ...
articleSchema.pre('validate', function (next) {
    // Create our slug from our title
    if (this.title) {
        this.slug = slugify(this.title, {
            lower: true,
            strict: true // get rid of any not allowed symbols for url
        })
    }

    // Convert our markdown to sanitized html
    if (this.markdown) {
        this.sanitizedHtml = dompurify.sanitize(marked(this.markdown))
    }

    next() // need to run it at the end
})

module.exports = mongoose.model('Article', articleSchema)
