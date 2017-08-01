let request = require('request');
let RandomParser = require('./random');
let errors = require('./errors');
let methods = require('./methods');
let config = require('./config').village;
let ch = require('cheerio');
let Xray = require('x-ray');
    let x = Xray();
let client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');


function VillageParser(config){
    RandomParser.apply(this, arguments);
}

VillageParser.prototype = Object.create(RandomParser.prototype);
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

VillageParser.prototype.getArticleBody = async function () {
    let body = this._html;
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
  let url = await this._randomUrl;
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
    let url = await this._generateRandomUrl(config);
    let html = await this._getHtmlForParse();
    try{
        if(url && html){
            let statusCode = await this._sendArticle();
            console.log(statusCode)
        }else{
            console.log('not random')
        }
    }catch(e){
        console.log(e.message)
    }
};

VillageParser.prototype.getArticleImages = async function(){
  return false
};

let parser = new VillageParser(config);

parser.everySecond();