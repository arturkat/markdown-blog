const express = require('express')
const router = express.Router()

// Get mongoose model for Article collection
const Article = require('./../models/article')

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

// Form action to Create new article
router.post('/', async (req, res, next) => {
    req.article = new Article()
    next()
}, saveArticleAndRedirect('new'))

// Form action to Edit an article
router.put('/:id', async (req, res, next) => {
    req.article = await Article.findById(req.params.id)
    next()
}, saveArticleAndRedirect('edit'))

// Incapsulate the functionality for Creating and Editing an Article in one function
function saveArticleAndRedirect(path) {
    return async (req, res) => {
        let article = req.article
        article.title = req.body.title
        article.description = req.body.description
        article.markdown = req.body.markdown

        try {
            article = await article.save() // Here save and get updated article object with new 'id'
            res.redirect(`/articles/${article.slug}`)
        } catch (err) {
            console.error('saveArticleAndRedirect: ', err)
            res.render(`articles/${path}`, {
                editedArticle: editedArticle
            })
        }
    }
}

// Form action to Delete an article ( _method="DELETE" )
router.delete('/:id', async (req, res) => {
    const article = await Article.findByIdAndDelete(req.params.id)
    res.redirect('/')
})

module.exports = router