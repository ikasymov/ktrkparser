const Parser = require('./parser');
const request = require('request');
const errors = require('./errors');
const methods = require('./methods');
const config = require('./config').akcha;
const ch = require('cheerio');
const Xray = require('x-ray');
const x = Xray();
const client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');

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
    const url = await this.getImgUrl();
    return [await this._saveImageByUrl(url)];
};


AkchaParser.prototype.start = async function(){
    const html = await this._generateHtml();
    const statusCode = await this._sendArticle(this._url);
    console.log(statusCode)
};


async function getUrlsAndStartParser(){
    return new Promise((resolve, reject)=>{
        x(config.parserUrl, '.col-md-6.content_news_list', ['.news_list_wrapper a@href'])((error, list)=>{
            let reverseList = list.reverse();
            client.get(config.dataName, (error, value)=>{
                let list = reverseList.slice(reverseList.indexOf(value) + 1);
                if(list.length > 0){
                    client.set(config.dataName, list.slice(-1));
                    list.forEach((elem)=>{
                        let parser = new AkchaParser(config, elem);
                        parser.start();
                    });
                    resolve(list)
                }
                reject(new Error('Not list'))
            });
        })
    });
}

getUrlsAndStartParser();