var request = require('request');
var sh = require('cheerio');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var methods = require('./methods');
var client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');

function getArticleUrls(){
    return new Promise(function (resolve, rejected) {
        var data = {
            url: 'http://www.rbc.ru/',
            method: 'GET'
        };
        request(data, function(error, req, body){
            if (error){
                rejected(error);
            }
            var doc = new dom().parseFromString(body);
            var leftSideBarHtml = xpath.select('/html/body/div[8]/div/div[2]/div[1]/div/div/div/div/div[2]/div', doc).toString();
            var $ = sh.load(leftSideBarHtml);
            var urls = $('a').map(function (i, elem) {
                return [$(this).attr('href')];
            }).get();
            resolve(urls);
        });
    });
}

function getArticleImages(doc) {
    return new Promise(function (resolve, rejected) {
        let imageHtml = xpath.select('/html/body/div[8]', doc).toString();
        let $ = sh.load(imageHtml);
        let imgUrls = '';
        $('div').each(function(i, elem){
            if($(this).attr('class') === 'article__main-image__link'){
                imgUrls += $(this).children('img')[0].attribs.src;
            }
        });
        if(imgUrls){
            resolve(imgUrls);
        }else{
            rejected(false);
        }
    });
}

function getArticleTheme(doc){
    return new Promise(function (resolve, rejected) {
        let titleHtml = xpath.select('/html/body/div[8]', doc).toString();
        let $ = sh.load(titleHtml);
        let title = $('div').filter('.article__header__title').children('span').text();
        resolve(title);
    });

}

function getArticleBody(doc) {
    return new Promise(function (resolve, rejected) {
        let bodyHtml = xpath.select("/html/body/div[8]", doc).toString();
        let $ = sh.load(bodyHtml);
        let text = '';
        $('div').each(function(i, elem){
            if($(this).attr('class') === 'article__text'){
                $('p').slice(0).each(function (i, element) {
                    text += $(this).text().replace(methods.regex, '') + '\r\n\r\n';
                });
            }
        });
        resolve(text);
    });
}
function sendArticle(data){
    let dataForSend = {
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
        }];
    }
    request(dataForSend, function (error, req, body) {
        if(error){
            return error;
        }
        return req.statusCode;
    });
}

function getDocForParser(url){
    return new Promise((resolve, rejected) =>{
        let data = {
            url: url,
            method: 'GET'
        };
        request(data, function(error, req, body){
            if(!error){
                resolve(new dom().parseFromString(body));
            }
            rejected(error);
        });
    });
}


function getArticleThemeBodyImageToken(args) {
    getDocForParser(args.urls)
        .then(doc => {
            Promise.all([getArticleTheme(doc), getArticleBody(doc), getArticleImages(doc)])
                .then(results =>{
                    let data = {
                        title: results[0],
                        body: results[1],
                        sendToken: args.token
                    };
                    let img = data[2];
                    if(img){
                        methods.saveImageAndReturnToken(img, function (token) {
                           data['img'] = token;
                        });
                    }
                    console.log(data)
                    // console.log(sendArticle(data));
                });
        });
}


Array.prototype.random = function(){
  return this[Math.floor((Math.random()*this.length))];
};


function divideListAndReturnUrl(urls){
    return new Promise(function(resolve, rejected){
        client.get('rbc_last_news', function(error, value){
            if(!error){
                var before = urls.indexOf(value);
                var divideList = urls.slice(0, before);
                if(divideList.length > 0){
                    resolve(divideList.random());
                }
                rejected();
            }
            rejected(error);
        });
    });
}


function callFunction(){
    getArticleUrls()
        .then(urls =>{
            return divideListAndReturnUrl(urls);
        })
        .then(randomUrl =>{
            return new Promise((resolve, rejected) =>{
                methods.getAuthToken((token)=>{
                    resolve({token: token, urls: randomUrl});
                });
            });
        })
        .then(data => {
            // console.log(data);
            getArticleThemeBodyImageToken(data);
        })
        .catch(error => {
            console.log(error + 'sdf');
        });
}


callFunction();

//test