let express = require('express');
let request = require('request');
let ch = require('cheerio');
let fs = require('fs');
let superagent = require('superagent');
let methods = require('./methods');
let xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
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
            resolve(new dom().parseFromString(body));
        })
    });
};

KtrkParser.prototype.getArticleImages = async function(){
    let doc = await this._doc();
    let title = xpath.select('//*[@id="page-content-wrapper"]/div[2]/div[2]/div/div[1]/div[1]/div[2]/div/figure/div', doc).toString();
    let $ = ch.load(title, {
    });
    let url = $('img')[0].attribs.src;
    return await this._saveImageByUrl((url ? url: false));
};

KtrkParser.prototype.getArticleBody = async function(){
    let doc = await this._doc();
    let bodyHtml = xpath.select('//*[@id="page-content-wrapper"]/div[2]/div[2]/div/div[1]/div[1]/div[2]/div/section', doc).toString();
    let $ = ch.load(bodyHtml);
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
    let titleHtml = xpath.select('/html/head/title', doc).toString();
    let getTitle = ch.load(titleHtml);
    let title = getTitle('title').text();
    if (title.split(' ').length !== 3){
        return getTitle('title').text();
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


let parser = new KtrkParser(config, 'ru', 14649);
parser.start();

