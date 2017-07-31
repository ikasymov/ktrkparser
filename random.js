let Parser = require('./parser');
let methods = require('./methods');
let client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');
let request = require('request');
let errors = require('./errors');

function RandomParser(config){
    Parser.apply(this, arguments)
}

RandomParser.prototype = Object.create(Parser.prototype);
RandomParser.prototype.constructor = RandomParser;



RandomParser.prototype._generateRandomUrl = async function(config){
    let url = await this._urls();
    let reverseUrl = url.reverse();
    return new Promise((resolve, reject)=>{
        client.get(this.dataName, (error, value)=>{
            let sliceListAfterLastNews = reverseUrl.slice(reverseUrl.indexOf(value) + 1);
            if(sliceListAfterLastNews.length  > 0){
                let randomUrl = methods.random(sliceListAfterLastNews);
                client.set(config.dataName, randomUrl);
                this._randomUrl = randomUrl;
                resolve(true)
            }else{
                resolve(false)
            }
        });
    });
};

RandomParser.prototype._getHtmlForParse = async function(){
    let url = await this._randomUrl;
    return new Promise((resolve, reject)=>{
        if(url){
            let data = {
                url: url,
                method: 'GET'
            };

            request(data, (error, req, body)=>{
                if(!error){
                    this._html = body;
                    resolve(body)
                }
                reject(error || new errors.PageNotFound('Village'))
            })
        }else{
            reject(new Error('Not random'))
        }
    });
};


module.exports = RandomParser;