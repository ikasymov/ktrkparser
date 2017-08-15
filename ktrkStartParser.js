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
    this.url = this.parseUrl + 'post/' + this.value +'/' + this.language
    let data = {
        url: this.url,
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
    return [await this._saveImageByUrl((url ? url: false))]
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
        let resultCode = await this._sendArticle(this.url);

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


async function getParseUrls(lastPost){
    client.get(config.dataName, (error, value)=>{
        console.log(lastPost + 'last post');
        if(lastPost !== value){
            let randomValue = methods.random(range.range(parseInt(value), parseInt(lastPost) + 1).slice(0, -1));
            let ruParser = new KtrkParser(config.ktrkRu, 'ru', randomValue);
            let kgParser = new KtrkParser(config.ktrkKg, 'kg', randomValue);
            ruParser.start();
            kgParser.start();
            client.set(config.dataName, randomValue + 1);
            client.set(config.dataName4, randomValue + 1);
        }else{
            console.log(error || 'Not random')
        }
        client.set(config.dataName2, !check);
    })
}

let checkCount = 0;
function getUrl(){
    client.get(config.dataName4, (error, value)=>{
        console.log('data4Value '+ value)
            if (check) {
                let data = {
                    url: config.ktrkRu.parserUrl + 'post/' + value + '/ru',
                    method: 'GET'
                };
                request(data, (error, req, body) => {
                    if (error || req.statusCode === 404) {
                        if(checkCount === 3){
                            check = false;
                            console.log('stop');
                            client.set(config.dataName4, parseInt(value) - 3, (error)=>{
                                if(!error){
                                    getUrl()
                                }
                            });
                        }else{
                            console.log('not stop');
                            client.set(config.dataName4, parseInt(value) + 1, (error)=>{
                                if(!error){
                                    getUrl();
                                }
                            });
                        }
                        checkCount ++;
                    } else {
                        console.log('not 404');
                        client.set(config.dataName4, parseInt(value) + 1, (error) => {
                            if (!error) {
                                getUrl();
                            }
                        });
                    }
                })
            } else {
                getParseUrls(value)
            }
    })
};

getUrl();