let request = require('request');
let xpath = require('xpath'),
    dom = require('xmldom').DOMParser;
let sh = require('cheerio');
let RandomParser = require('./random');
let config = require('./config').kp;


function KpParser(config){
    RandomParser.apply(this, arguments);
}

KpParser.prototype = Object.create(RandomParser.prototype);
KpParser.prototype.constructor = KpParser;

KpParser.prototype.getArticleImages = async function(){
    let doc = await this._doc();
    let imageHtml = xpath.select('//*[@id="bodyArticleJS"]/header/div[4]/div/img', doc).toString();
    let $ = sh.load(imageHtml);
    try {
        let imgUrl = 'http:' + $('img')[0].attribs.src;
        return [await this._saveImageByUrl(imgUrl)]
    }catch (error){
        return false
    }

};

KpParser.prototype.getArticleTheme = async function(){
    let doc = await this._doc();
    let head = xpath.select('//*[@id="bodyArticleJS"]/header', doc).toString();
    let $ = sh.load(head);
    return $('h1').text();
};

KpParser.prototype.getArticleBody = async function(){
    let doc = await this._doc();
    let articleBodyHtml = xpath.select('//*[@id="hypercontext"]', doc).toString();
    let $ = sh.load(articleBodyHtml);
    let text = '';
    $('p').slice(0).each(function (i, element) {
        text += $(this).text();
    });
    return text;
};

KpParser.prototype._urls = async function(){
    let data = {
        url: this.parseUrl,
        method: 'GET'
    };
    return new Promise((resolve, reject)=>{
        request(data, (error, req, body)=>{
            let doc = new dom().parseFromString(body);
            let leftsiteBar = xpath.select('//*[@id="newsRegionJS"]', doc).toString();
            let $ = sh.load(leftsiteBar);
            resolve($('div').children('article').map(function(i, elem){
                return ['http://www.kp.kg/online/news/' + $(this).attr('data-news-id') + '/'];
            }).get());
        });
    });
};

KpParser.prototype._doc = async function(){
    return new dom().parseFromString(this._html);
};

KpParser.prototype.start = async function(){
  try{
      let url = await this._generateRandomUrl(config);
      let html = await this._getHtmlForParse();

      if(url && html){
          let resultCode = await this._sendArticle(this._randomUrl);
          console.log(resultCode)
      }
  }catch(e){
      console.log(e.message)
  }
};

let parser = new KpParser(config);
parser.start();