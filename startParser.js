var express = require('express');
var request = require('request');
var ch = require('cheerio');
var fs = require('fs');
var superagent = require('superagent');
var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
var client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');
var convert_str = require('html-to-text');
function getImageToken(id, url, language, callback) {
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


function parserKtrk(language) {
    console.log('start');
    var data = {
        url: 'https://api.namba1.co/users/auth',
        method: 'POST',
        body: {
            'phone': '996703384504',
            'password': '0779153478i'
        },
        json: true
    };
    request(data, function (error, req, body) {
        var check = true;
        var sendToken = body.data.token;
        whileLoop();
        function whileLoop() {
            client.get('last_news_' + language, function (error, value) {
                var baseUrl = 'http://www.ktrk.kg/post/' + value +'/' + language;
                var data = {
                    url: baseUrl,
                    method: 'GET'
                };
                request(data, function (error, requ, body) {
                    if (requ.statusCode === 404){
                        check = false;
                        console.log('check false')
                    }else {
                        var doc = new dom().parseFromString(body);
                        var titleHtml = xpath.select('//*[@id="page-content-wrapper"]/div[5]/div/section/div/div[1]/div[1]/div[2]/div[1]/p/span[1]', doc).toString();
                        var getTitle = ch.load(titleHtml);
                        var title = getTitle('span').map(function (i, elem) {
                            if (getTitle(this).attr('class') === undefined){
                                return getTitle(this).text()
                            }
                        }).get().join(' ');
                        var bodyText = xpath.select('//*[@id="page-content-wrapper"]/div[5]/div/section/div/div[1]/div[1]/div[2]/div[1]/div[3]', doc).toString();
                        var $ = ch.load(bodyText);
                        $('p').slice(2).each(function (i, elem) {
                            title += '\r\n' + $(this).text() + '\r\n';
                        });
                        var text = title.replace(/(?:&nbsp;|<br>)|(?:&ndash;|<br>)|(?:&raquo;|<br>)|(?:&laquo;|<br>)|(?:&ldquo;|<br>)|(?:&rdquo;|<br>)|(?:&mdash;|<br>)|(<([^>]+)>)/g, '')
                        var getGroup = {
                            ru: 1136,
                            kg: 1134
                        };
                        getImageToken(value, baseUrl, language, function (token) {
                            var data = {
                                url: 'https://api.namba1.co/groups/' + getGroup[language] +'/post',
                                method: 'POST',
                                body: {
                                    content: text,
                                    comment_enabled: 1,
                                    attachments: [{
                                        type: 'media/image',
                                        content: token
                                    }]
                                },
                                headers: {
                                    'X-Namba-Auth-Token': sendToken
                                },
                                json: true
                            };
                            request(data, function (error, req, body) {
                                if(check){
                                    client.set('last_news_' + language, parseInt(value) + 1, function (error, value) {
                                        whileLoop();
                                    })
                                }else {
                                    console.log('not check');
                                }
                            })
                        });

                    }
                    console.log('response end')
                });
            })
        }
    });

};
parserKtrk('ru');
parserKtrk('kg');



