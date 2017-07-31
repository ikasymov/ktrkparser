let RandomParser = require('./random');
let request = require('request');
let errors = require('./errors');
let config = require('./config').forbes;
let xRay = require('x-ray'),
    x = xRay();


function ForbesParser(config){
    RandomParser.apply(this, arguments);
};

ForbesParser.prototype = Object.create(RandomParser.prototype);
ForbesParser.prototype.constructor = ForbesParser;

ForbesParser.prototype._urls = async function(){
    return new Promise((resolve, reject)=>{
        x(this.parseUrl, '.panel-pane.pane-page-content', ['.block-href-material.block-href-material-0.active .item-material .href-material@href'])((error, list)=>{
            if(!error){
                resolve(list);
            }
            reject(error)
        });
    });
};

ForbesParser.prototype.getArticleBody = async function(){
  let html = this._html;
  return new Promise((resolve, reject)=>{
      x(html, '.article-top', '.body-part-top.js-mediator-article')((error, text)=>{
          x(html, '.article-top', '.subtitle')((error, title)=>{
              if(!error){
                  resolve(title + '\r\n\r\n' + text)
              }
              reject(error)
          });
      })
  });
};

ForbesParser.prototype.getArticleTheme = async function(){
    let url = this._randomUrl;
    return new Promise((resolve, reject)=>{
        x(url, 'title')((error, title)=>{
            if(!error){
                resolve(title)
            }
            reject(error)
        })
    })

};

ForbesParser.prototype.getArticleImages = async function(){
    let html = this._html;
    return new Promise((resolve, reject)=>{
        x(html, '.article-top', '.field-img.first img@src')((error, imgUrl)=>{
            if(!error){
                resolve(this._saveImageByUrl(imgUrl))
            }
            reject(error)
        })
    });

};

ForbesParser.prototype.start = async function(){
  try{
      let urls = await this._generateRandomUrl(config);
      let html = await this._getHtmlForParse();
      if(urls && html){
          let resultCode = await this._sendArticle();
          console.log(resultCode)
      }else{
          console.log('Not random')
      }
  }catch(e){
      console.log(e.message)
  }
};

let parser = new ForbesParser(config);
parser.start();