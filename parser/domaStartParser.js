let Parser = require('../parser');
let request = require('request');
let errors = require('../errors');
let config = require('../config').doma;
let xRay = require('x-ray'),
    x = xRay();
let async = require('async');
let ch = require('cheerio');
let db = require('../models');

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
    return new Promise((resolve, reject)=>{
        x($(body).html(), ['.content-box .field-row img@data-original'])((error, text)=>{
            let imgTokenList = [];
            text.filter(filterArray).forEach((elem)=>{
                if(error){
                    reject(error)
                }
                imgTokenList.push(this.parseUrl.slice(0, -1) + elem)
            });
            resolve(imgTokenList)
        });
    });
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
    try{
        let urls = await this.listOfImgUrl();
        let token = [];
        for(let i in urls){
            token.push(await this._saveImageByUrl(urls[i]))
        }
        return token
    }catch(e){
        return e
    }
};

DomaParser.prototype.getArticleBody = async function(){
    let html = this._html;
    try{
        let $ = ch.load(html);
        let domElem = $("*[itemprop = 'description']").get(0);
        let content = $(domElem).text().trim();
        let body = $("*[itemprop = 'recipeInstructions']").get(0);
        x($(body).html(), ['.content-box .plain-text'])((error, text)=>{
            content += '\r\n' + text.join('\r\n\r\n');
        });
        return content
    }catch(e){
        return e
    }
};

DomaParser.prototype.start = async function(){
    try{
        let html = await this._generateHtml();
        if(html){
            return this._sendArticle(this._url);
        }
    }catch(e) {
        return e
    }
};


async function startParser() {
    let list = await new Promise((resolve, reject)=>{
        x(config.parserUrl + 'retsepty', '.grid-two-column__column.grid-two-column__column_center.tags_content_pages_container',
            ['.card-container .card .card__content .card__description  a@href'])((error, list)=>{
                resolve(list)
        })
    });
    let reverseList = list.reverse();
    let value = await db.Parser.findOrCreate({
        where: {
            key: config.dataName
        },
        defaults: {
            key:config.dataName,
            value: reverseList[0]
        }
    });

    let parseList = reverseList.slice(reverseList.indexOf(value[0].value) + 1);
    if(parseList.length > 0){
        for (let i in list){
            let elem = list[i];
            let parser = new DomaParser(config, elem);
            let result = await parser.start();
            console.log(result)
        }
        await value[0].update({value:parseList.slice(-1)[0]})
        return 'OK'
    }else{
        return 'not list'
    }
}


startParser().then(result=>{
    console.log(result);
    process.exit();
}).catch(error=>{
    console.log(error)
})

