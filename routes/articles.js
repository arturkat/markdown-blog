const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')

// Get mongoose model for Article collection
const Article = require('./../models/article')

/* Allows to work with files (images) */
const multer = require('multer')
// Set up multer
const uploadPath = path.join('public', Article.coverImageBasePath) // create path where to save image on the server
const imagesMimeTypes = ['image/jpeg', 'image/png', 'image/gif'] // set up allowed image types
const multerUpload = multer({
    dest: uploadPath,
    fileFilter: (req, file, callback) => {
        // 1st param - error object
        // 2nd param {boolean} allowed image types
        callback(null, imagesMimeTypes.includes(file.mimetype))
    }
})


router.get('/', (req, res) => {
    res.redirect('/')
})

// Route to dispay the page with form for creating a new article
router.get('/new', (req, res) => {
    // res.send('In articles')

    res.render('articles/new', {
        article: new Article() // создаём пустую статью для темплейта, что б не было ошибок
    })
})

// Route to display the page with form for editing an existing article
router.get('/edit/:id', async (req, res) => {
    const editArticle = await Article.findById(req.params.id)
    if (editArticle == null) res.redirect('/')
    res.render('articles/edit', {
        article: editArticle
    })
})

// Route to display the article page
router.get('/:slug', async (req, res) => {
    // res.send(`/:id = ${req.params.id}`)
    // const article = await Article.findById(req.params.id)

    const article = await Article.findOne({
        slug: req.params.slug
    })
    if (article == null) res.redirect('/')
    res.render('articles/show', {
        article: article
    })
})

/* Form action to Create new article */
// multerUpload.single('cover') - the 'cover' is a name of input in form
router.post('/new', multerUpload.single('cover'), async (req, res, next) => {
    req.article = new Article()
    next()
}, saveArticleAndRedirect('new'))

/* Form action to Edit an article */
// multerUpload.single('cover') - the 'cover' is a name of input in form
router.put('/:id', multerUpload.single('cover'), async (req, res, next) => {
    req.article = await Article.findById(req.params.id)
    next()
}, saveArticleAndRedirect('edit'))

/* Incapsulate the functionality for Creating and Editing an Article in one function */
function saveArticleAndRedirect(path) {
    return async (req, res) => {
        let article = req.article
        article.title = req.body.title
        article.description = req.body.description
        article.markdown = req.body.markdown

        // multer adds the 'file' variable to our 'req'
        const fileName = req.file != null ? req.file.filename : null
        article.coverImageName = fileName

        try {
            article = await article.save() // Here save and get updated article object with new 'id'
            res.redirect(`/articles/${article.slug}`)
        } catch (err) {
            console.error('saveArticleAndRedirect: ', err)
            // Remove the image from server if something went wrong
            if (article.coverImageName !== null) {
                removeArticleCover(article.coverImageName)
            }
            res.render(`articles/${path}`, {
                article: article,
                errorMessage: 'Something went wrong'
            })
        }
    }
}

function removeArticleCover(fileName) {
    fs.unlink(path.join(uploadPath, fileName), err => {
        if (err) {
            console.error('Cant remove the cover image: ', err)
        }
    })
}

/* Form action to Delete an article ( _method="DELETE" ) */
router.delete('/:id', async (req, res) => {
    const article = await Article.findByIdAndDelete(req.params.id)
    res.redirect('/')
})


module.exports = router