let request = require('request');
let superagent = require('superagent');
let fs = require('fs');
let client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');

function Parser(config){
    this.groupId = config.group;
    this.nambaOne = config.nambaone;
    this.parseUrl = config.parserUrl;
    this.dataName = config.dataName;
    this.user = process.env.namba_user;
    this.passport = process.env.namba_passport;
    this.dataForEverySecond = config.dataForSecond
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
            request(imgUrl).pipe(fs.createWriteStream('./' + 'kp' +  value + imgUrl.slice(-4))).on('finish', function (error, req) {
                if (error){
                    reject(error);
                }
                superagent.post('https://files.namba1.co').attach('file', './' + 'kp' +  value + imgUrl.slice(-4)).end(function(err, req) {
                    fs.unlink('./' + 'kp' +  value + imgUrl.slice(-4), function (error, value) {});
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
    if(img.length > 0){
        dataForSend.body['attachments'] = [];
        for(let i in img){
            dataForSend.body.attachments.push({type: 'media/image', content: img[i]})
        };
    }
    return new Promise((resolve, reject)=>{
        request(dataForSend, function (error, req, body) {
            if(error){
                reject(error);
            }
            resolve(req.statusCode)
        });
    });
};

Parser.prototype.everySecond = function () {
    client.get(this.dataForEverySecond, (error, value)=>{
        let current = parseInt(value);
        let dict = {
            0: true,
            1: false
        };
        if(dict[current]){
            this.start();
            client.set(this.dataForEverySecond, 1)
        }else{
            console.log('false');
            client.set(this.dataForEverySecond, 0)
        }
    })
};

module.exports = Parser;