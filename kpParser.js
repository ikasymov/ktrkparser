var request = require('request');
var check = true;
var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
var sh = require('cheerio');
var fs = require('fs');
var superagent = require('superagent');
var client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');

function changeCheckVariable(){
    check = !check
}

function getAuthToken(callback){
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
            if (error || req.statusCode === 404){
                console.log('Error get auth token');
                callback('error')
            }else{
                callback(body.data.token)
            }
        })
}

function getArticleTheme(url, callback){
        var data = {
            url: url,
            method: 'GET'
        };
        request(data, function (error, req, body) {
            if (error || req.statusCode === 404){
                callback('error')
            }else {
                var doc = new dom().parseFromString(body);
                var head = xpath.select('//*[@id="bodyArticleJS"]/header', doc).toString();
                var $ = sh.load(head);
                callback($('h1').text());
            }
        })
}

function downloadImage(url){

}


function getArticleImage(url, callback){
    var data = {
        url: url,
        method: 'GET'
    };
    request(data, function (error, req, body) {
        if (error || req.statusCode === 404){
            callback('error')
        }else{
            var doc = new dom().parseFromString(body);
            var imageHtml = xpath.select('//*[@id="bodyArticleJS"]/header/div[4]/div/img', doc).toString();
            var $ = sh.load(imageHtml);
            try {
                var imgUrl = 'http:' + $('img')[0].attribs.src;
            }catch (error){
                callback('none');
                return;
            }
            if (imgUrl){
                var value = url.split('/').slice(-2).slice(0);
                request(imgUrl).pipe(fs.createWriteStream('./' + 'kp' +  value + '.jpg')).on('finish', function (error, req) {
                    if (error){
                        console.log(error)
                    }
                    superagent.post('https://files.namba1.co').attach('file', './' + 'kp' +  value + '.jpg').end(function(err, req) {
                        fs.unlink('./' + 'kp' +  value + '.jpg', function (error, value) {});
                        callback(req.body.file)
                    });
                });
            }
        }
    })
}

function getArticleBody(url, callback) {
    var data = {
        url: url,
        method: 'GET'
    };
    request(data, function (error, req, body) {
        if (error || req.statusCode === 404){
            callback('error')
        }else{
            var doc = new dom().parseFromString(body);
            var articleBodyHtml = xpath.select('//*[@id="hypercontext"]', doc).toString();
            var $ = sh.load(articleBodyHtml);
            var text = '';
            $('p').slice(0).each(function (i, element) {
               text += $(this).text()
            });
            callback(text)
        }
    })
}

function postArticle(data, callback){
    request(data, function (error, req, body) {
        callback(req.statusCode)
    })
}

function baseLogic(callback) {
    getAuthToken(function (sendToken) {
        client.get('kp_news', function (error, value) {
            var url = 'http://www.kp.kg/online/news/' + value + '/';
            getArticleTheme(url, function (theme) {
                if(theme === 'error'){
                    client.set('kp_news_second', parseInt(value) + 1);
                    client.get('kp_news_second', function (error, last_value) {
                       if(last_value - value === 5){
                           changeCheckVariable();
                           callback(check);
                           return;
                       }else{
                           callback(true);
                           return;
                       }
                    });
                }else{
                    getArticleBody(url, function (text) {
                        getArticleImage(url, function (token) {
                            var data = {
                                url: 'https://api.namba1.co/groups/' + 1137 +'/post',
                                method: 'POST',
                                body: {
                                    content: theme + '\r\n' + text,
                                    comment_enabled: 1,
                                },
                                headers: {
                                    'X-Namba-Auth-Token': sendToken
                                },
                                json: true
                            };
                            if (token === 'none'){
                            }else{
                                data.body['attachments'] = [{
                                    type: 'media/image',
                                    content: token
                                }]
                            }
                            postArticle(data, function (statusCode) {
                                console.log(statusCode);
                                client.set('kp_news', parseInt(value) + 1, function (error, value) {
                                    callback(check)
                                });
                            })
                        })
                    });
                }
            })
        });

    });
}

function AsyncWhileLoop() {
    baseLogic(function (check) {
        if (check){
            AsyncWhileLoop()
        }else{
            console.log('end');
            process.exit()
        }
    });
}



AsyncWhileLoop();