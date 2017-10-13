const Parser = require('../parser');
const request = require('request');
const errors = require('../errors');
const methods = require('../methods');
const config = require('../config').akcha;
const ch = require('cheerio');
const Xray = require('x-ray');
const x = Xray();
let cron = require('node-cron');
let async = require('async');
let db = require('../models');

let Handler = require('../handlerSteps');
let send = require('../send');

function AkchaParser(config, url){
    Parser.apply(this, arguments);
    this._url = url
}


AkchaParser.prototype = Object.create(Parser.prototype);
AkchaParser.prototype.constructor = AkchaParser;

AkchaParser.prototype._generateHtml = async function(){
    const url = this._url;
    return new Promise((resolve, reject)=>{
        const data = {
            url: url,
            method: 'GET'
        };
        request(data, (error, req, body)=>{
            if(error || req.statusCode === 404){
                reject(errors.PageNotFound('AkchaBar'))
            }
            this._html = body;
            resolve(body)
        })
    })
};

AkchaParser.prototype.getArticleBody = async function(){
    let html = this._html;
    return new Promise((resolve, reject)=>{
        x(html, '.content_wrapper', ['.description p'])((error, list)=>{
            if(!error){
                resolve(list.join('\n\n'));
            }
            reject(error)
        })
    });
};

AkchaParser.prototype.getArticleTheme = async function(){
    return new Promise((resolve, reject)=>{
        x(this._url, 'title')((error, title)=>{
            if(!error){
                resolve(title)
            }
            reject(error)
        })
    });
};
AkchaParser.prototype.getImgUrl = async function(){
    const html = this._html;
    return new Promise((resolve, reject)=>{
        x(html, '.col-md-9', '.has_image.hidden-xs.hidden-sm img@src')((error, url)=>{
            if(!error){
                resolve(url)
            }
            reject(error)
        })
    })
};

AkchaParser.prototype.getArticleImages = async function(){
    try{
        const url = await this.getImgUrl();
        return [await this._saveImageByUrl(url)];
    }catch(e){
        return e
    }
};


AkchaParser.prototype.start = async function(){
    try{
        const html = await this._generateHtml();
        return this._sendArticle(this._url);
    }catch(e){
        return e
    }
};

async function getUrlList(){
  return new Promise((resolve, reject)=>{
    x(config.parserUrl, '.col-md-6.content_news_list', ['.news_list_wrapper a@href'])((error, list)=>{
      resolve(list)
    })
  });
}


async function getUrlsAndStartParser(){
    let list = await new Promise((resolve, reject)=>{
        x(config.parserUrl, '.col-md-6.content_news_list', ['.news_list_wrapper a@href'])((error, list)=>{
            resolve(list)
        })
    });
    try{
        let reverseList = list.reverse();
        let value = await db.Parser.findOrCreate({
            where: {
                key: config.dataName
            },
            defaults: {
                key: config.dataName,
                value: reverseList[0]
            }

        });
        let parseList = reverseList.slice(reverseList.indexOf(value[0].value) + 1);
        if(parseList.length > 0){
            for (let i  in parseList){
                let elem = parseList[i];
                let parser = new AkchaParser(config, elem);
                let result = await parser.start();
                console.log(result)
            }
            await value[0].update({value: parseList.slice(-1)[0]});
            return 'OK'
        }
        console.log('Not List')
    }catch(e){
        return e
    }

}

async function startParser(){
  try{
    let list = await getUrlList();
    let handler = new Handler(list, 'akcha');
    let url = await handler.getUrl();
    if(url){
      await send(url, 1168)
    }
    return true
  }catch(e){
    throw e
  }
}

startParser().then(result=>{
    process.exit();
}).catch(e=>{
    console.log(e)
});