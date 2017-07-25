let express = require('express');
let request = require('request');
let ch = require('cheerio');
let fs = require('fs');
let superagent = require('superagent');
let methods = require('./methods');
let xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
let range = require('range');
let Parser = require('./parser');
let config = require('./config').ktrk;
let errors  = require('./errors');
let client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');

let check = true;

function KtrkParser(config, language, value){
    Parser.apply(this, arguments);
    this.language = arguments[1];
    this.value = arguments[2];
}

KtrkParser.prototype = Object.create(Parser.prototype);
KtrkParser.prototype.constructor = KtrkParser;


KtrkParser.prototype._doc = async function(){
    let data = {
        url: config.parserUrl + 'post/' + this.value +'/' + this.language,
        method: 'GET'
    };
    return new Promise((resolve, reject)=>{
        request(data, (error, req, body)=>{
            if (error || req.statusCode === 404){
                check = false;
                reject(error || new errors.PageNotFound('KTRK'));
            }
            resolve(body);
        })
    });
};

KtrkParser.prototype.getArticleImages = async function(){
    let doc = await this._doc();
    let $ = ch.load(doc);
    let url = $('figure').children('.main-news-thumb').children('img')[0].attribs.src;
    return await this._saveImageByUrl((url ? url: false));
};

KtrkParser.prototype.getArticleBody = async function(){
    let doc = await this._doc();
    let $ = ch.load(doc);
    let html = $('div').children('section');
    html.children('div').remove();
    html.children('aside').remove();
    let text = '';
    $('section').children().each(function (i, elem) {
        if ($(this).attr('class') !== 'pull-right') {
            text += $(this).text().replace(methods.regex, '')
        }
    });
    return text;
};
KtrkParser.prototype.getArticleTheme = async function(){
    let doc = await this._doc();
    let $ = ch.load(doc);
    let title = $('title').text();
    if (title.split(' ').length !== 3){
        return title;
    }else{
        throw new errors.ContentNotFound(this.value);
    }
};


KtrkParser.prototype.start = async function(){
    try{
        let resultCode = await this._sendArticle();
        console.log(resultCode)
    }catch(e){
        if(e instanceof errors.ContentNotFound){
            console.log(e.message)
        }else if(e instanceof errors.PageNotFound){
            console.log(e.message)
        }else{
            console.log(e)
        }
    }
};


function getDate(){
    let date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    let min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    let sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    let year = date.getFullYear();

    let month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    let day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + '-' + month + '-' + day
}

async function getHtml(){
    let data = {
        url: config.parserUrl + 'posts/general/date?d=' + getDate(),
        method: 'GET'
    };
    return new Promise((resolve, reject)=>{
        request(data, function(error, req, body){
            resolve(body)
        })
    });
}

async function getLastPost() {
    let body = await getHtml();
    let $ = ch.load(body);
    return $('div').children('.post-title').attr('href').split('/').slice(-2)[0];
}

async function getParseUrls(){
    let lastPost = await getLastPost();
    client.get(config.dataName, (error, value)=>{
        client.get(config.dataName2, function (error, check) {
            if(lastPost !== value && check === 'true'){
                let randomValue = methods.random(range.range(parseInt(value), parseInt(lastPost) + 1));
                let ruParser = new KtrkParser(config.ktrkRu, 'ru', randomValue);
                let kgParser = new KtrkParser(config.ktrkKG, 'kg', randomValue);
                ruParser.start();
                kgParser.start();
                client.set(config.dataName, randomValue);
            }else{
                console.log(error || 'Not random')
            }
            client.set(config.dataName2, !check);
        })
    })
}

getParseUrls();