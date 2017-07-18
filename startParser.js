var express = require('express');
var request = require('request');
var ch = require('cheerio');
var fs = require('fs');
var superagent = require('superagent');
var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
var client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');
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
        var title = xpath.select('//*[@id="page-content-wrapper"]/div[2]/div[2]/div/div[1]/div[1]/div[2]/div/figure/div', doc).toString();
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
            'phone': '996121121121',
            'password': 'password112'
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
                    if (requ.statusCode === 404 || error){
                        client.get('check_404_' + language, function (error, counter) {
                            client.set('check_404_' + language, parseInt(counter) + 1);
                            client.set('last_news_' + language, parseInt(value) + 1);
                            if (parseInt(counter) + 1 === 3){
                                client.set('last_news_' + language, parseInt(value) - 2);
                                client.set('check_404_' + language, 0);
                                check = false
                            }else{
                                whileLoop();
                            }
                        });
                        console.log('check false')
                    }else {
                        var doc = new dom().parseFromString(body);
                        var titleHtml = xpath.select('/html/head/title', doc).toString();
                        var getTitle = ch.load(titleHtml);
                        var title = getTitle('title').text();
                        var bodyHtml = xpath.select('//*[@id="page-content-wrapper"]/div[2]/div[2]/div/div[1]/div[1]/div[2]/div/section', doc).toString();
                        var $ = ch.load(bodyHtml);
                        var bodyText = $('p').text();
                        title += '\r\n' + bodyText;
                        if(bodyText){
                            var text = title.replace(/(?:&nbsp;|<br>)|(?:&ndash;|<br>)|(?:&raquo;|<br>)|(?:&laquo;|<br>)|(?:&ldquo;|<br>)|(?:&rdquo;|<br>)|(?:&mdash;|<br>)|(?:&nbs;|<br>)|(<([^>]+)>)/g, '');
                            var getGroup = {
                                ru: 1144,
                                kg: 1143
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
                        }else{
                            if(check){
                                client.set('last_news_' + language, parseInt(value) + 1, function (error) {
                                    whileLoop()
                                })
                            }
                        }


                    }
                    console.log('response end');
                    // process.exit()
                });
            })
        }
    });

};
parserKtrk('ru');
parserKtrk('kg');



