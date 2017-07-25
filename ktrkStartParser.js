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
let client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');

let check = true;
let notPageError = new Error('Page not found');
let notContentError = new Error('Content Not Found');

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
                reject(notPageError);
            }
            resolve(new dom().parseFromString(body));
        })
    });
};

KtrkParser.prototype.getArticleImages = async function(){
    try{
        let doc = await this._doc();
        let title = xpath.select('//*[@id="page-content-wrapper"]/div[2]/div[2]/div/div[1]/div[1]/div[2]/div/figure/div', doc).toString();
        let $ = ch.load(title, {
        });
        let url = $('img')[0].attribs.src;
        return await this._saveImageByUrl((url ? url: false));
    }catch (e){
        throw e
    }
};

KtrkParser.prototype.getArticleBody = async function(){
    try{
        let doc = await this._doc();
        let bodyHtml = xpath.select('//*[@id="page-content-wrapper"]/div[2]/div[2]/div/div[1]/div[1]/div[2]/div/section', doc).toString();
        let $ = ch.load(bodyHtml);
        let text = '';
        $('section').children().each(function (i, elem) {
            if ($(this).attr('class') !== 'pull-right') {
                text += $(this).text()
            }
        });
        return text;
    }catch (e){
        throw e
    }
};
KtrkParser.prototype.getArticleTheme = async function(){
    try{
        let doc = await this._doc();
        let titleHtml = xpath.select('/html/head/title', doc).toString();
        let getTitle = ch.load(titleHtml);
        let title = getTitle('title').text();
        if (title.split(' ').length !== 3){
            return getTitle('title').text();
        }else{
            throw notContentError;
        }
    }catch (e){
        throw e
    }
};


KtrkParser.prototype.start = async function(){
    try{
        let resultCode = await this._sendArticle();
        console.log(resultCode)
    }catch(e){
        switch (e){
            case notContentError:
                console.log('Not content');
                break;
            case notPageError:
                console.log('Page not found');
                break;
        }
    }
};


let parser = new KtrkParser(config, 'ru', 14649);
parser.start();

