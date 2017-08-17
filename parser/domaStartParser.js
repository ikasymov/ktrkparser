let Parser = require('../parser');
let request = require('request');
let errors = require('../errors');
let config = require('../config').doma;
let xRay = require('x-ray'),
    x = xRay();
let async = require('async');
let ch = require('cheerio');
let client = require('../client');

function DomaParser(config, url){
    Parser.apply(this, arguments);
    this._url = url;
}

DomaParser.prototype = Object.create(Parser.prototype);
DomaParser.prototype.constructor = DomaParser;

DomaParser.prototype._generateHtml = async function(){
  let url = this._url;
  return new Promise((resolve, reject)=>{
      let data = {
          url: url,
          method: 'GET'
      };
      request(data, (error, req, body)=>{
          if(!error){
              this._html = body;
              resolve(body)
          }
          reject(error, errors.PageNotFound('Doma'))
      })
  })
};

function filterArray(elem){
    if(elem !== undefined){
        return elem
    }
}
DomaParser.prototype.listOfImgUrl = async function(){
    let html = this._html;
    let $ = ch.load(html);
    let body = $("*[itemprop = 'recipeInstructions']").get(0);
    let imgTokenList = [];
    x($(body).html(), ['.content-box .field-row img@data-original'])((error, text)=>{
        text.filter(filterArray).forEach((elem)=>{

            imgTokenList.push(this.parseUrl.slice(0, -1) + elem)
        })
    });
    return imgTokenList
};
DomaParser.prototype.getArticleTheme = async function(){
  return new Promise((resolve, reject)=>{
      x(this._url, 'title')((error, title)=>{
          if(!error){
              resolve(title)
          }
          reject(error)
      })
  })
};

DomaParser.prototype.getArticleImages = async function(){
    let urls = await this.listOfImgUrl();
    let token = [];
    for(let i in urls){
        token.push(await this._saveImageByUrl(urls[i]))
    }
    return token
};

DomaParser.prototype.getArticleBody = async function(){
    let html = this._html;
    return new Promise((resolve, reject)=>{
        let $ = ch.load(html)
        let domElem = $("*[itemprop = 'description']").get(0);
        let content = $(domElem).text().trim();
        let body = $("*[itemprop = 'recipeInstructions']").get(0);
        x($(body).html(), ['.content-box .plain-text'])((error, text)=>{
            content += '\r\n' + text.join('\r\n\r\n');
        });
        resolve(content)
    });
};

DomaParser.prototype.start = async function(){
    let html = await this._generateHtml();
    if(html){
        let statusCode = await this._sendArticle(this._url);
        console.log(statusCode)
    }
};

function asyncStart(elem){
    let parser = new DomaParser(config, elem);
    return parser.start();
}

async function startParser() {
    return new Promise((resolve, reject)=>{
      x(config.parserUrl + 'retsepty', '.grid-two-column__column.grid-two-column__column_center.tags_content_pages_container',
          ['.card-container .card .card__content .card__description  a@href'])((error, list)=>{
          let reverseList = list.reverse();
          client.get(config.dataName, (error, value)=>{
              let list = reverseList.slice(reverseList.indexOf(value) + 1);
              if(list.length > 0){
                  client.set(config.dataName, list.slice(-1));
                  async.map(list, asyncStart, (error, result)=>{
                      if(!error){
                          resolve(result)
                      }else{
                          reject(error)
                      }
                  });
                  resolve(list)
              }
              reject(new Error('Not list'))
          });
      })
  })
}


module.exports.start = startParser();

