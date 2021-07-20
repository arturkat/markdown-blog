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
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath)
    },
    filename: function (req, file, cb) {
        const imgExtension = file.mimetype.split('/')[1]
        cb(null, file.fieldname + '-' + Date.now() + '.' + imgExtension)
        // console.log(file)
    }
})
const multerUpload = multer({
    // dest: uploadPath,
    storage: storage,
    fileFilter: (req, file, callback) => {
        // 1st param - error object
        // 2nd param {boolean} allowed image types
        callback(null, imagesMimeTypes.includes(file.mimetype))
    }
})
const multerFields = [
    {
        name: 'cover',
        maxCount: 1
    },
    {
        name: 'coverDB',
        maxCount: 1
    }
]


router.get('/', (req, res) => {
    res.redirect('/')
})

// Route to dispay the page with form for creating a new article
router.get('/new', (req, res) => {
    // res.send('In articles')

    res.render('articles/new', {
        article: new Article(), // создаём пустую статью для темплейта, что б не было ошибок
        pageRoute: 'new'
    })
})

// Route to display the page with form for editing an existing article
router.get('/edit/:id', async (req, res) => {
    const editArticle = await Article.findById(req.params.id)
    if (editArticle == null) res.redirect('/')
    res.render('articles/edit', {
        article: editArticle,
        pageRoute: 'edit'
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

/* Form action to Delete an article ( _method="DELETE" ) */
router.delete('/:id', async (req, res) => {
    const article = await Article.findByIdAndDelete(req.params.id)
    removeArticleCover(article.coverImageName)
    res.redirect('/')
})

/* Form action to Create new article */
// multerUpload.single('cover') - the 'cover' is a name of input in form
// multerUpload.fields(multerFields) - use multiple fields [req.files]
router.post('/new', multerUpload.fields(multerFields), async (req, res, next) => {
    req.article = new Article()
    next()
}, saveArticleAndRedirect('new'))

/* Form action to Edit an article */
// multerUpload.single('cover') - the 'cover' is a name of input in form
// multerUpload.fields(multerFields) - use multiple fields [req.files]
router.put('/:id', multerUpload.fields(multerFields), async (req, res, next) => {
    req.article = await Article.findById(req.params.id)
    next()
}, saveArticleAndRedirect('edit'))

/* Incapsulate the functionality for Creating and Editing an Article in one function */
function saveArticleAndRedirect(route) {
    return async (req, res, next) => {
        let article = req.article
        article.title = req.body.title
        article.description = req.body.description
        article.markdown = req.body.markdown

        /* Handle the Cover Image */
        // multer adds the 'file' object to the 'req' [if one file]
        /* const fileName = req.file != null ? req.file.filename : null */
        // multer adds the 'files' object to the 'req' [if multiple files]
        const cover = req.files['cover'] ? req.files['cover'][0] : null
        const coverDB = req.files['coverDB'] ? req.files['coverDB'][0] : null

        /* Save coverDB to DB */
        if (coverDB != null) {
            try {
                const coverDBBuffer = fs.readFileSync(coverDB.path)
                article.coverImageDB = new Buffer.from(coverDBBuffer, 'base64') // article.coverImageDB = coverDBBuffer --- also works
                article.coverImageDBType = coverDB.mimetype
                removeFile(coverDB.path) // remove the file automatically loaded by multer
            } catch (err) {
                console.error('Cant read the file: ', err)
            }
        }

        // the 'new' article route
        if (route === 'new') {
            if (cover != null) {
                article.coverImageName = cover.filename
            }
        }

        // the 'edit' acrticle route
        if (route === 'edit') {
            // add new cover to the file system
            if (cover != null) {
                // if we have already had the cover before THEN remove it from the server
                if (article.coverImageName) {
                    removeArticleCover(article.coverImageName)
                }
                // add the new cover image to DB
                article.coverImageName = cover.filename
            }
            // is remove the cover image from the file system
            if (req.body.isRemoveCover === 'yes') {
                if (article.coverImageName != null) {
                    removeArticleCover(article.coverImageName)
                    article.coverImageName = null
                }
            }
            // is remove the coverDB image from the DB
            if (req.body.isRemoveCoverDB === 'yes') {
                article.coverImageDB = null
                article.coverImageDBType = null
            }
        }

        try {
            article = await article.save() // Here save and get updated article object with new 'id'
            res.redirect(`/articles/${article.slug}`)
        } catch (err) {
            console.error('saveArticleAndRedirect: ', err)
            // Remove the image from server if something went wrong
            if (article.coverImageName !== null) {
                removeArticleCover(article.coverImageName)
            }
            res.render(`articles/${route}`, {
                article: article,
                errorMessage: 'Something went wrong'
            })
        }
    }
}

function removeArticleCover(fileName) {
    if (fileName === null) return
    fs.unlink(path.join(uploadPath, fileName), err => {
        if (err) {
            console.error('Cant remove the cover image: ', err)
        }
        console.info('[removeArticleCover] Removed cover: ', fileName)
    })
}

function removeFile(filePath) {
    if (filePath === null) return
    fs.unlink(filePath, err => {
        if (err) {
            console.error('Cant remove the file: ', err)
        }
        console.info('[removeFile] Removed file: ', filePath)
    })
}

module.exports = router