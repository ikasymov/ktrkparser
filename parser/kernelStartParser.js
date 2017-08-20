let Parser = require('../parser');
let request = require('request');
let errors = require('../errors');
let methods = require('../methods');
let config = require('../config').kernel;
let Xray = require('x-ray');
let x = Xray();
let db = require('../models');

function KernelParser(config, url, img){
    Parser.apply(this, arguments);
    this._url = url;
    this.articleImage = img
}

KernelParser.prototype = Object.create(Parser.prototype);
KernelParser.prototype.constructor = KernelParser;

KernelParser.prototype._generateHtml = async function(){
    return new Promise((resolve, reject)=>{
        let data = {
            url: this._url,
            method: 'GET'
        };
        request(data, (error, req, body)=>{
           if(error || req.statusCode === 404){
               reject(error || errors.PageNotFound('Kernel'))
           }
           this._html = body;
           resolve(body)
        });
    });
};
KernelParser.prototype.getListOfImages = async function(){
    let html = this._html;
    return new Promise((resolve, reject)=>{
        x(html, 'article', ['.entry-content img@src'])((error, urls)=>{
            if(!error){
                let filterUrls = urls.filter((elem)=> {
                    if (elem.slice(-3) !== 'gif'){
                        return elem
                    }
                });
                resolve(filterUrls)
            }
            reject(error)
        })
    });
};

KernelParser.prototype.getArticleImages = async function(){
    try{
        let tokens = [await this._saveImageByUrl(this.articleImage)];
        let self = this;
        let urls = await this.getListOfImages();
        for (let i in urls){
            tokens.push(await self._saveImageByUrl(urls[i]))
        }
        return tokens
    }catch(e){
        return e
    }
};

KernelParser.prototype.getArticleTheme = async function(){
    return new Promise((resolve, reject)=>{
        x(this._url, 'title')((error, title)=>{
            if(!error){
                resolve(title)
            }
            reject(error)
        })
    });
};

KernelParser.prototype.getArticleBody = async function(){
    let html = this._html;
    return new Promise((resolve, reject)=>{
        x(html, 'article', ['.entry-content'])((error, result)=>{
            if(error){
                reject(error)
            }
            resolve(result[0].slice(0, -50))
        })
    });
};

KernelParser.prototype.start = async function(){
    try{
        let html = await this._generateHtml();
        let text = await this.getArticleBody();
        return this._sendArticle(this._url);
    }catch(e){
        return e
    }
};

async function startParser(){
    let objectList = await new Promise((resolve, reject)=>{
        x('http://kernel.net.kg/?paged=1', '#main', {
            href: x('.more-link-wrapper', ['a@href']),
            image: x('.entry-wrapper .entry-image-wrapper', ['.post-thumbnail img@data-large-file'])
        })((error, objectList)=>{
            if(error){
                reject(error)
            }
            resolve(objectList)
        });
    });

    let lastObject = '';
    let img = objectList.image.filter((elem)=>{
        if(elem !== lastObject){
            lastObject = elem;
            return elem
        }
        lastObject = elem;
    }).reverse();
    let reverseList = objectList.href;
    let value = await db.Parser.findOrCreate({
        where:{
            key: config.dataName
        },
        defaults: {
            key: config.dataName,
            value: reverseList[0]
        }
    });
    let list = reverseList.slice(reverseList.indexOf(value[0].value) + 1);
    if(list.length > 0){
        for(let i in list){
            let url = reverseList[i];
            let image = img[i];
            let parser = new KernelParser(config, url, image);
            let result = await parser.start();
            console.log(result)
        }
        await value[0].update({value: list.slice(-1)[0]});
        return 'OK'
    }else{
        return new Error('not list')
    }
}

startParser().then(result=>{
    process.exit();
}).catch(e=>{
    console.log(e)
})