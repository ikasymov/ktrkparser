let Parser = require('./parser');
let methods = require('./methods');
let request = require('request');
let errors = require('./errors');
let db = require('./models');

function RandomParser(config){
    Parser.apply(this, arguments)
}

RandomParser.prototype = Object.create(Parser.prototype);
RandomParser.prototype.constructor = RandomParser;



RandomParser.prototype._generateRandomUrl = async function(config){
    let url = await this._urls();
    let reverseUrl = url.reverse();
    let value = await db.Parser.findOrCreate({
        where: {
            key: config.dataName
        },
        defaults: {
            key: config.dataName,
            value: reverseUrl[0]
        }
    });
    let sliceListAfterLastNews = reverseUrl.slice(reverseUrl.indexOf(value[0].value) + 1);
    if(sliceListAfterLastNews.length  > 0){
        let randomUrl = methods.random(sliceListAfterLastNews);
        this._randomUrl = randomUrl;
        await value[0].update({value: randomUrl});
        return true
    }else{
        return false
    }
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