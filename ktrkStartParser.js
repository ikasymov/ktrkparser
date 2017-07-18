var express = require('express');
var request = require('request');
var ch = require('cheerio');
var fs = require('fs');
var superagent = require('superagent');
var methods = require('./methods');
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
        methods.saveImageAndReturnToken(imagelink, function (token) {
            callback(token)
        });
    })
}


function parserKtrk(language) {
    console.log('start');
    methods.getAuthToken(function (token) {
        var check = true;
        var sendToken = token;
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

                        var text = $('section').contents().map(function (p1, p2, p3) {
                            if ($(this).attr('class') !== 'pull-right') {
                                return $(this).text()
                            }
                        }).get().toString();

                        function cleanArray(actual) {
                            var newArray = new Array();
                            for (var i = 0; i < actual.length; i++) {
                                var current = actual[i];
                                if (current && current !== '\n' && current !== ',' && current !== ',\n\n' && current !== ',\n') {
                                    newArray.push(actual[i]);
                                }
                            }
                            return newArray;
                        }

                        var splitTile = text.split(' ');
                        var checkTitle = title.split(' ');
                        var bodyText = cleanArray(splitTile).join(' ').replace(/[, ]+/g, ' ').replace(methods.regex, '');
                        if (checkTitle.length > 3) {
                            title += '\r\n' + bodyText;
                            var getGroup = {
                                ru: 1144,
                                kg: 1143
                            };
                            getImageToken(value, baseUrl, language, function (token) {
                                var data = {
                                    url: 'https://api.namba1.co/groups/' + getGroup[language] + '/post',
                                    method: 'POST',
                                    body: {
                                        content: title,
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
                                    if (check) {
                                        client.set('last_news_' + language, parseInt(value) + 1, function (error, value) {
                                            whileLoop();
                                        })
                                    } else {
                                        console.log('not check');
                                    }
                                })
                            });
                        } else {
                            if (check) {
                                client.set('last_news_' + language, parseInt(value) + 1, function (error) {
                                    whileLoop()
                                })
                            }


                        }
                        console.log('response end');
                        // process.exit()
                    }
                });
            })
        }
    });


};
parserKtrk('ru');
parserKtrk('kg');



