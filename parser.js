let request = require('request');
let superagent = require('superagent');
let fs = require('fs');


function Parser(config){
    this.groupId = config.group;
    this.nambaOne = config.nambaone;
    this.parseUrl = config.parserUrl;
    this.dataName = config.dataName;
    this.user = config.user;
    this.passport = config.passport;
};

Parser.prototype.generateToken = async function(){
    let data = {
        url: this.nambaOne + '/users/auth',
        method: 'POST',
        body: {
            'phone': this.user,
            'password': this.passport
        },
        json: true
    };
    return new Promise((resolve, rejected)=>{
        request(data, function (error, req, body) {

            if (error || req.statusCode === 404) {
                rejected(new Error('Namba server not work'));
            } else {
                this.sendToken = body.data.token;
                resolve(this.sendToken);
            }
        });
    });
};

Parser.prototype._saveImageByUrl = async function(imgUrl){
    let value = Math.random();
    return new Promise((resolve, reject)=>{
        if (imgUrl){
            request(imgUrl).pipe(fs.createWriteStream('./' + 'kp' +  value + '.jpg')).on('finish', function (error, req) {
                if (error){
                    reject(error);
                }
                superagent.post('https://files.namba1.co').attach('file', './' + 'kp' +  value + '.jpg').end(function(err, req) {
                    fs.unlink('./' + 'kp' +  value + '.jpg', function (error, value) {});
                    resolve(req.body.file);
                });
            });
        }
        else{
            resolve(imgUrl)
        }
    });
};

Parser.prototype._sendArticle = async function(){
    let title = await this.getArticleTheme();
    let body = await this.getArticleBody();
    let img = await this.getArticleImages();
    this._sendToken = await this.generateToken();
    if(await this._sendToken){
        let dataForSend = {
            url:  this.nambaOne + '/groups/' + this.groupId +'/post',
            method: 'POST',
            body: {
                content: title + '\r\n\r\n' + body,
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
        });
    }
};

module.exports = Parser;