let request = require('request');
let sh = require('cheerio');
let xpath = require('xpath');
let dom = require('xmldom').DOMParser;
let methods = require('../methods');
let superagent = require('superagent');
let fs = require('fs');
let config = require('../config').rbk;
let Parser = require('../parser');
let errors = require('../errors');
let client = require('../client');

function RBCParser(config){
    Parser.apply(this, arguments);
}


RBCParser.prototype = Object.create(Parser.prototype);
RBCParser.prototype.constructor = RBCParser;

RBCParser.prototype.start = async function () {
    try{
        this._randomUrl = await this._generateRandom();
        client.set(this.dataName, await this._randomUrl);
        if(await this._randomUrl){
            let resultCode = await this._sendArticle(this._randomUrl);
            console.log(resultCode)
        }
    }catch(e){
        if(e instanceof errors.ContentNotFound){
            console.log(e.message)
        }else if(e instanceof errors.PageNotFound){
            console.log(e.message)
        }else{
            console.log(e.message)
        }
    }
};

/*
Not calling another place
 */
RBCParser.prototype._generateRandom = async function () {
    let urls = await this._urls();
    return new Promise((resolve, rejected)=>{
        client.get(this.dataName, function(error, value){
            if(!error){
                let before = urls.indexOf(value);
                let divideList = urls.slice(0, before);
                if(divideList.length > 0){
                    resolve(methods.random(divideList))
                }else{
                    rejected(new Error('Not random List'));
                }
            }
        });
    });
};

RBCParser.prototype._doc = async function(){
    let url = await this._randomUrl;
    return new Promise((resolve, rejected) =>{
        let data = {
            url: url,
            method: 'GET'
        };
        request(data, function(error, req, body){
            if(error || req.statusCode === 404){
                rejected(new errors.PageNotFound('RBC'))
            }
            resolve(new dom().parseFromString(body));
        });
    });
};

RBCParser.prototype._urls = async function(){
    let parseUrl = this.parseUrl;
    return new Promise(function (resolve, rejected) {
        let data = {
            url: parseUrl,
            method: 'GET'
        };
        request(data, function(error, req, body){
            if (error || req.statusCode === 404){
                rejected(error || new errors.PageNotFound('KTRK'));
            }else{
                let doc = new dom().parseFromString(body);
                let leftSideBarHtml = xpath.select('/html/body/div[8]/div/div[2]/div[1]/div/div/div/div/div[2]/div', doc).toString();
                let $ = sh.load(leftSideBarHtml);
                let urls = $('a').map(function (i, elem) {
                    return [$(this).attr('href')];
                }).get();
                resolve(urls);
            }
        });
    });
};


RBCParser.prototype.getArticleImages = async function(){
    let doc = await this._doc();
    let imageHtml = xpath.select('/html/body/div[8]', doc).toString();
    let $ = sh.load(imageHtml);
    let imgUrls = '';
    $('div').each(function(i, elem){
        if($(this).attr('class') === 'article__main-image__link'){
            imgUrls += $(this).children('img')[0].attribs.src;
        }
    });
    if(imgUrls){
        return [await this._saveImageByUrl(imgUrls)]
    }else{
        return false;
    }
};

RBCParser.prototype.getArticleTheme = async function(){
    let doc = await this._doc();
    let titleHtml = xpath.select('/html/body/div[8]', doc).toString();
    let $ = sh.load(titleHtml);
    return $('div').filter('.article__header__title').children('span').text();
};

RBCParser.prototype.getArticleBody = async function(){
    let doc = await this._doc();
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
    return text;
};



function starting(){
    let parser = new RBCParser(config);
    parser.everySecond();
}
module.exports.start = starting();
