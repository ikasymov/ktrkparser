let Parser = require('./parser');
let request = require('request');
let errors = require('./errors');
let methods = require('./methods');
let config = require('./config').kernel;
let ch = require('cheerio');
let Xray = require('x-ray');
let x = Xray();
let client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');

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
        console.log(e)
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
    let html = await this._generateHtml();
    let text = await this.getArticleBody();
    let statusCode = await this._sendArticle(this._url);
    console.log(statusCode)
};

async function startParser(){
    x('http://kernel.net.kg/?paged=1', '#main', {
        href: x('.more-link-wrapper', ['a@href']),
        image: x('.entry-wrapper .entry-image-wrapper', ['.post-thumbnail img@data-large-file'])
    })((error, objectList)=>{
        if(error){
            console.log(error)
        }
        let lastObject = '';
        let img = objectList.image.filter((elem)=>{
            if(elem !== lastObject){
                lastObject = elem;
                return elem
            }
            lastObject = elem;
        }).reverse();
        let reverseList = objectList.href;
        client.get(config.dataName, (error, value)=>{
            let list = reverseList.slice(reverseList.indexOf(value) + 1);
            if(list.length > 0){
                client.set(config.dataName, list.slice(-1));
                for(let i in list){
                    let url = reverseList[i];
                    let image = img[i];
                    let parser = new KernelParser(config, url, image);
                    parser.start();
                }
            }else{
                console.log('not list')
            }
        });
    })
}
startParser();