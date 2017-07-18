var request = require('request');
var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
var sh = require('cheerio');
var fs = require('fs');
var superagent = require('superagent');
var methods = require('./methods');
var client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');



function postArticle(data, callback){
        var dataForSend = {
            url: 'https://api.namba1.co/groups/' + 1145 +'/post',
            method: 'POST',
            body: {
                content: data.title + '\r\n' + data.text,
                comment_enabled: 1
            },
            headers: {
                'X-Namba-Auth-Token': data.sendToken
            },
            json: true
        };
    if(data.imgToken !== 'none'){
        dataForSend.body['attachments'] = [{
            type: 'media/image',
            content: data.imgToken
        }]
    }
    request(dataForSend, function (error, req, body) {
        callback(req.statusCode)
    })
}

function getArticleImage(doc, callback){
    var imageHtml = xpath.select('//*[@id="bodyArticleJS"]/header/div[4]/div/img', doc).toString();
    var $ = sh.load(imageHtml);
    try {
        var imgUrl = 'http:' + $('img')[0].attribs.src;
    }catch (error){
        callback('none');
        return;
    }
    if (imgUrl){
        methods.saveImageAndReturnToken(imgUrl, function (token) {
            callback(token)
        });
    }
}

function getArticleBody(doc, callback) {
    var articleBodyHtml = xpath.select('//*[@id="hypercontext"]', doc).toString();
    var $ = sh.load(articleBodyHtml);
    var text = '';
    $('p').slice(0).each(function (i, element) {
        text += $(this).text()
    });
    callback(text)
}

function getArticleTheme(doc, callback) {
    var head = xpath.select('//*[@id="bodyArticleJS"]/header', doc).toString();
    var $ = sh.load(head);
    var title = $('h1').text();
    callback(title)
}

function getArticleThemeTextImgToken(url, callback){
    var data = {
        url: url,
        method: 'GET'
    };
    request(data, function (error, req, body) {
        if (error || req.statusCode === 404){
            callback('error')
        }else {
            var doc = new dom().parseFromString(body);
            getArticleTheme(doc, function (theme) {
                getArticleBody(doc, function (text) {
                    getArticleImage(doc, function (token) {
                        callback(theme, text, token)
                    })
                })
            });
        }
    })
}

function returnArticleForSend(url, sendToken, callback){
    getArticleThemeTextImgToken(url, function (title, text, imgToken) {
        var data = {
            title: title,
            text: text,
            imgToken: imgToken,
            sendToken: sendToken
        };
        postArticle(data, function (statusCode) {
            callback(statusCode)
        })
    })

}

function baseLogic(id, sendToken, callback) {
        var url = 'http://www.kp.kg/online/news/' + id + '/';
        returnArticleForSend(url, sendToken, function (statusCode) {
            callback(statusCode)
        });
}

function getListOfIds(doc, callback){
    var leftsiteBar = xpath.select('//*[@id="newsRegionJS"]', doc).toString();
    var $ = sh.load(leftsiteBar);
    var ids = $('div').children('article').map(function(i, elem){
        return [$(this).attr('data-news-id')]
    }).get().reverse();
    callback(ids);
}

function getUrl(){
    var data = {
        url: 'http://www.kp.kg/',
        method: 'GET'
    };
    request(data, function (error, req, body) {
        var doc = new dom().parseFromString(body);
        getListOfIds(doc, function (ids) {
            var afterLoopList = [];
            var counter = 0;
            client.get('kp_news', function (error, value) {
                methods.getAuthToken(function (sendToken) {
                    ids.forEach(function (key) {
                        counter ++;
                        if (value < key &&  value !== key){
                            baseLogic(key, sendToken, function (statusCode) {
                                afterLoopList.push(key);
                                if (counter === ids.length){
                                    var check = afterLoopList[0];
                                    var checkList = 0;
                                    afterLoopList.forEach(function(key){
                                        checkList++;
                                        if (key > check){
                                            check = key
                                        }
                                        if (checkList === afterLoopList.length){
                                            client.set('kp_news', check, function (error) {
                                                console.log('STOP')
                                            })
                                        }
                                    })
                                }
                            });
                        }else{
                            console.log('Not Page')
                        }
                    });
                });
            });
        });
    });
}
getUrl();