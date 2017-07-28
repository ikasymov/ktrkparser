let request = require('request');
let Parser = require('./parser');
let errors = require('./errors');
let methods = require('./methods');
let config = require('./config').village;
let ch = require('cheerio');
let Xray = require('x-ray');
    let x = Xray();
let client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');


function VillageParser(config){
    Parser.apply(this, arguments);
}

VillageParser.prototype = Object.create(Parser.prototype);
VillageParser.prototype.constructor = VillageParser;

VillageParser.prototype._urls = async function(){
    return new Promise((resolve, reject)=>{
        x(this.parseUrl, '.posts-layout.posts-layout-with-news', ['.lastnews-block .post-item.post-item-news a@href'])
        ((error, list)=>{
            if(!error){
                resolve(list);
            }
            reject(error)
        })
    });
};

VillageParser.prototype._getRandomUrl = async function(){
    let url = await this._urls();
    let reverseUrl = url.reverse();
    return new Promise((resolve, reject)=>{
        client.get(this.dataName, (error, value)=>{
            let sliceListAfterLastNews = reverseUrl.slice(reverseUrl.indexOf(value) + 1);
            if(sliceListAfterLastNews.length  > 0){
                let randomUrl = methods.random(sliceListAfterLastNews);
                client.set(config.dataName, randomUrl);
                this._random = randomUrl;
                resolve(true)
            }else{
                resolve(false)
            }
        });
    });
};

VillageParser.prototype._getHtmlForParse = async function(){
    let url = await this._random;
    let data = {
        url: url,
        method: 'GET'
    };
    return new Promise((resolve, reject)=>{
        request(data, (error, req, body)=>{
            if(!error){
                resolve(body)
            }
            reject(error || new errors.PageNotFound('Village'))
        })
    })
};

VillageParser.prototype.getArticleBody = async function () {
    let body = await this._getHtmlForParse();
    return new Promise((resolve, reject)=>{
        x(body, '.row.post-body', ['.article-text .stk-reset'])((error, text)=>{
            if(!error){
                resolve(text.join(' '))
            }
            reject(error)
        })
    });
};

VillageParser.prototype.getArticleTheme = async function(){
  let url = await this._random;
  return new Promise((resolve,reject)=>{
      x(url, 'title')((error, title)=>{
          if(!error){
              resolve(title)
          }
          reject(error)
      })
  })
};

VillageParser.prototype.start = async function(){
    if(await this._getRandomUrl()){
        let statusCode = await this._sendArticle();
        console.log(statusCode)
    }else{
        console.log('Not random')
    }
};

VillageParser.prototype.getArticleImages = async function(){
  return false
};

let parser = new VillageParser(config);

parser.start();