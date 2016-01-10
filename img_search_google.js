var express = require('express')
var request = require('request')
var mongo = require('./node_modules/mongoose/node_modules/mongodb').MongoClient
var app = express()
var json = []
var searches = []
var date = ""
var urlDb = 'mongodb://localhost:27017/searchTerms'


app.get('/api/latest/imagesearch/', function(req, res) {
    mongo.connect(urlDb, function(err, db) {
        if (err) throw err
        var collection = db.collection('searches')
        collection.find().sort({
            _id: -1
        }).limit(10).toArray(function(err, docs) {
            if (err) throw err
            searches = []
            docs.forEach(function(data) {
                searches.push({
                    term: data['term'],
                    when: data['when']
                })
            })
            res.send(searches)
            db.close()
        })
    })
})

app.get('/api/imagesearch/:sterm', function(req, res) {
    var sterm = req.params.sterm
    var query = req.query
    var startIndex = 1

    if (req.query['offset']) {
        startIndex = parseInt(req.query['offset']) * 10 + 1 - 10
    }

    var requestUrl = 'https://www.googleapis.com/customsearch/v1?q=' + encodeURIComponent(sterm) + '&cx=' + process.env.GOOGLE_SEARCH_ENGINE_ID + '&num=10&searchType=image&start=' + startIndex + '&key=' + process.env.GOOGLE_API_KEY

    request(requestUrl, function(err, response, body) {
        if (err || response.statusCode !== 200) {
            return res.sendStatus(500);
        }
        json = []
        var obj = JSON.parse(body)
        obj['items'].forEach(function(data) {
            json.push({
                'image url': data["link"],
                'thumbnail url': data["image"]["thumbnailLink"],
                'alt text': data["snippet"],
                'page url': data["image"]["contextLink"]

            })
        })

        res.send(json)
        mongo.connect(urlDb, function(err, db) {
            if (err) throw err
            var search = {
                term: sterm,
                when: new Date().toISOString()
            }
            var collection = db.collection('searches')
            collection.insert(search, function(err, data) {
                if (err) throw err
                db.close()
            })
        })
    });

})

app.listen(process.env.PORT)