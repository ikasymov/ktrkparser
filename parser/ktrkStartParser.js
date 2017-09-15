let express = require('express');
let request = require('request');
let ch = require('cheerio');
let fs = require('fs');
let superagent = require('superagent');
let methods = require('../methods');
let range = require('range');
let Parser = require('../parser');
let config = require('../config').ktrk;
var Xray = require('x-ray');
var x = Xray();
let errors  = require('../errors');
let db = require('../models');

let check = true;

async function getDateTime() {

    let date = new Date();

    let hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    let min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    let sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    let year = date.getFullYear();

    let month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    let day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    let dash = '-';
    return year + dash + month + dash + day;

};

function KtrkParser(config, language, value){
    Parser.apply(this, arguments);
    this.value = arguments[2];
}

KtrkParser.prototype = Object.create(Parser.prototype);
KtrkParser.prototype.constructor = KtrkParser;


KtrkParser.prototype._doc = async function(){
    let data = {
        url: this.value,
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

Parser.prototype._sendArticle = async function(url){
  try{
    let title = await this.getArticleTheme();
    let img = await this.getArticleImages();
    let body = await this.getArticleBody();
    if(title.trim()){
      title += '\n' + body;
      this._sendToken = await this.generateToken();
      let dataForSend = {
        url:  this.nambaOne + '/groups/' + this.groupId +'/post',
        method: 'POST',
        body: {
          content: title,
          comment_enabled: 1
        },
        headers: {
          'X-Namba-Auth-Token': this._sendToken,
        },
        json: true
      };
      if(img){
        dataForSend.body['attachments'] = [{
          type: 'media/image',
          content: img
        }];
      }
      return new Promise((resolve, reject)=>{
        request(dataForSend, function (error, req, body) {
          if(error){
            reject(error);
          }
          resolve(req.statusCode)
        });
      }).catch(e=>{
        return e
      })
    }else{
      throw new Error('Not title')
    }
  }catch(e){
    return e
  }
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
        this.ktrk_check = true;
        let resultCode = await this._sendArticle(this.value);

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



async function getUrl(language, dataName){
    let cookieJar = request.jar();
    let date = await getDateTime();
    let data = {
        url: 'http://www.ktrk.kg/locale/' + language,
        method: 'GET',
        jar: cookieJar
    };
    let list = await new Promise((resolve, reject)=>{
        request(data, (error, req, body)=>{
            let dataforlanguage = {
                url: 'http://www.ktrk.kg/posts/general/date?d=' + date,
                method: 'GET',
                jar: cookieJar
            };
            request(dataforlanguage, (error, req, body)=>{
                x(body, '.section.article-section .section-body', ['.categories a.post-title@href'])((error, list)=>{
                    resolve(list)
                });
            })

        });
    });
    let value = await db.Parser.findOrCreate({
        where:{
            key: dataName
        },
        defaults: {
            key: dataName,
            value: list.join('|')
        }
    });
    if(value[1]){
        return value[0].value.split('|')
    }
    let oldList = value[0].value.split('|');
    let filterList = list.filter((elem)=>{
        if(oldList.indexOf(elem) === -1){
            return elem
        }
    });
    await value[0].update({value: list.join('|')});
    return filterList

};


async function getParseUrls(){
    let listRu = await getUrl('ru', config.ktrkRu.dataName);
    let listKg = await getUrl('kg', config.ktrkKg.dataName);
    for(let i in listRu){
        let elem = listRu[i];
        let ruParser = new KtrkParser(config.ktrkRu, 'ru', elem);
        await ruParser.start();
    }
    for(let i in listKg){
        let elem = listKg[i];
        let kgParser = new KtrkParser(config.ktrkKg, 'kg', elem);
        await kgParser.start();
    }
    return 'OK'
}
getParseUrls().then(result=>{
    console.log(result);
    process.exit()
})