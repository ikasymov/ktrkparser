var request = require('request');
var sh = require('cheerio');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var methods = require('./methods');
var htmlToText = require('html-to-text');
var client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');

function getArticleUrl(){
    return new Promise(function (resolve, rejected) {
        var data = {
            url: 'http://www.rbc.ru/',
            method: 'GET'
        };
        request(data, function(error, req, body){
            if (error){
                rejected(error)
            }
            var doc = new dom().parseFromString(body);
            var leftSideBarHtml = xpath.select('/html/body/div[8]/div/div[2]/div[1]/div/div/div/div/div[2]/div', doc).toString();
            var $ = sh.load(leftSideBarHtml);
            var urls = $('a').map(function (i, elem) {
                return [$(this).attr('href')]
            }).get();
            resolve(urls);
        })
    });
}

function getArticleImages(doc) {
    return new Promise(function (resolve, rejected) {
        var imageHtml = xpath.select('/html/body/div[8]', doc).toString();
        var $ = sh.load(imageHtml);
        var imgUrls = '';
        $('div').each(function(i, elem){
            if($(this).attr('class') === 'article__main-image__link'){
                imgUrls += $(this).children('img')[0].attribs.src;
            }
        });
        if(imgUrls){
            resolve(imgUrls)
        }else{
            rejected('not Pictures')
        }
    });
}

function getArticleTheme(doc){
    return new Promise(function (resolve, rejected) {
        var titleHtml = xpath.select('/html/body/div[8]', doc).toString();
        var $ = sh.load(titleHtml);
        var title = $('div').filter('.article__header__title').children('span').text();
        resolve(title)
    })

}

function getArticleBody(doc) {
    return new Promise(function (resolve, rejected) {
        var bodyHtml = xpath.select("/html/body/div[8]", doc).toString();
        var $ = sh.load(bodyHtml);
        var text = '';
        $('div').each(function(i, elem){
            if($(this).attr('class') === 'article__text'){
                text += htmlToText.fromString($(this).html(), {
                    ignoreHref: true,
                    ignoreImage: true,
                    noLinkBrackets: true,
                    singleNewLineParagraphs: true,
                    wordwrap: 130
                }).replace(methods.regex, '')
            }
        });
        resolve(text)
    })
}
function sendArticle(data){
    return new Promise(function (resolve, rejected) {
        var dataForSend = {
            url: 'https://api.namba1.co/groups/' + 1146 +'/post',
            method: 'POST',
            body: {
                content: data.title + '\r\n\r\n' + data.text,
                comment_enabled: 1
            },
            headers: {
                'X-Namba-Auth-Token': data.sendToken
            },
            json: true
        };
        if(data.img){
            dataForSend.body['attachments'] = [{
                type: 'media/image',
                content: data.img
            }]
        }
        request(dataForSend, function (error, req, body) {
            if(error){
                rejected(error)
            }
            resolve(req.statusCode)
        })
    });
}

function getArticleThemeBodyImageToken(url, sendToken) {
    return new Promise(function (resolve, rejected) {
        var data = {
            url: url,
            method: 'GET'
        };
        request(data, function (error, req, body) {
            if(error){
                rejected(error)
            }
            var doc = new dom().parseFromString(body);
            getArticleTheme(doc)
                .then(function (theme) {
                    getArticleBody(doc)
                        .then(function (body) {
                            getArticleImages(doc)
                                .then(function (imgUrls) {

                                    methods.saveImageAndReturnToken(imgUrls, function (token) {
                                        var data = {
                                            title: theme,
                                            text: body,
                                            img: token,
                                            sendToken: sendToken
                                        };
                                        sendArticle(data)
                                            .then(function (statusCode) {
                                                console.log(statusCode)
                                            })
                                            .catch(console.log(error))
                                    })
                                })
                                .catch(function (error) {
                                    console.log('error')
                                });
                                    var data = {
                                        title: theme,
                                        text: body,
                                        sendToken: sendToken
                                    };
                                    sendArticle(data)
                                })
                        })
                })
        })
}

function callFunction(){
    getArticleUrl()
        .then(function (urls) {
            client.get('rbc_last_news', function (error, value) {
                if (!error){
                    console.log(value);
                    var beforeThis = urls.indexOf(value);
                    var sliceUrl = urls.slice(0, beforeThis);
                    console.log(sliceUrl.length);
                    if(beforeThis !== 0){
                        client.set('rbc_last_news', sliceUrl[0], function (error) {
                            methods.getAuthToken(function (sendToken) {
                                sliceUrl.forEach(function (key) {
                                    getArticleThemeBodyImageToken(key, sendToken)
                                });
                            })
                        });
                    }
                }
            });
        })
        .catch(function (error) {
            console.log(error)
        })
}

callFunction();