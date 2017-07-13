var express = require('express');
var router = express.Router();
var request = require('request');
var ch = require('cheerio');
var fs = require('fs');
var superagent = require('superagent');
var request2 = require('http-get');
var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
var index = require('./routes/index');
module.exports.getImageToken = function (id, url, language, callback) {
    var data = {
        url: url,
        method: 'GET'
    };
    request(data, function (error, req, body) {
        if(error){
            console.log(error)
        }
        var doc = new dom().parseFromString(body);
        var title = xpath.select('//*[@id="post-thumb"]', doc).toString();
        var $ = ch.load(title, {
        });
        var imagelink = $('img')[0].attribs.src;
        request(imagelink).pipe(fs.createWriteStream('./' + id + language + '.jpg')).on('finish', function (error, req) {
            if (error){
                console.log(error)
            }
            // console.log(page)
            superagent.post('https://files.namba1.co').attach('file', './' + id + language + '.jpg').end(function(err, req) {
                fs.unlink('./' + id + language + '.jpg', function (error, value) {});
                callback(req.body.file)
            });
        });

    })
};




function startParserKg() {
    index.ParserKtrk('kg')
}
function startaParserRu(){
    index.ParserKtrk('ru')
}