var express = require('express');
var router = express.Router();
var request = require('request');
var ch = require('cheerio');

var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;

var client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');
router.get('/', function(req, res, next) {
    setInterval(function () {
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
            var token = body.data.token;
            whileLoop();
            function whileLoop() {
                client.get('last_news', function (error, value) {
                    var data = {
                        url: 'http://www.ktrk.kg/post/' + value +'/kg',
                        method: 'GET'
                    };
                    request(data, function (error, requ, body) {
                        if (requ.statusCode === 404){
                            check = false;
                            console.log('check false')
                        }else {
                            var doc = new dom().parseFromString(body);
                            var title = xpath.select('//*[@id="page-content-wrapper"]/div[5]/div/section/div/div[1]/div[1]/div[2]/div[1]/div[3]', doc).toString();
                            var $ = ch.load(title, {
                            });
                            var text = $('p').replaceWith('\r\n').text().replace(/(?:&nbsp;|<br>)|(?:&ndash;|<br>)|(?:&raquo;|<br>)|(?:&laquo;|<br>)|(?:&ldquo;|<br>)|(?:&rdquo;|<br>)/g, '');
                            var data = {
                                url: 'https://api.namba1.co/groups/1134/post',
                                method: 'POST',
                                body: {
                                    content: text,
                                    comment_enabled: 1
                                },
                                headers: {
                                    'X-Namba-Auth-Token': token
                                },
                                json: true
                            };
                            request(data, function (error, req, body) {
                                if(check){
                                    client.set('last_news', parseInt(value) + 1, function (error, value) {
                                        whileLoop();
                                    })
                                }else {
                                    console.log('not check');
                                    res.end()
                                }
                            })
                        }
                        res.end();
                        console.log('response end')
                    });
                })
            }
        });
    }, 14400000)
});

module.exports = router;
