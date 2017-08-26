let request = require('request');
let superagent = require('superagent');
let fs = require('fs');
let download = require('image-downloader');
let db = require('./models');
let userConfig = require('./user_config');

function Parser(config){
    this.groupId = config.group;
    this.nambaOne = config.nambaone;
    this.parseUrl = config.parserUrl;
    this.dataName = config.dataName;
    this.user = userConfig.user;
    this.passport = userConfig.password;
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

function deleteFile(path){
    return new Promise((resolve, reject)=>{
        fs.unlink(path, function (error) {
            if(error){
                console.log(error);
                reject(error)
            }
            console.log('File deleted');
            resolve()
        })
    });
}

Parser.prototype._saveImageByUrl = async function(imgUrl){
    console.log('save image and return token')
    let format = imgUrl.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gmi)[0];
    imgUrl = imgUrl.split('.').slice(0, -1).join('.') + format;
    return new Promise((resolve, reject)=> {
        const options = {
            url: imgUrl,
            dest: './'
        };
        download.image(options).then(({filename, image}) => {
            console.log('download image');
            return'./'+ filename;
        }).then(file=>{
            superagent.post('https://files.namba1.co').attach('file', file).end(function(err, req) {
                console.log('send image');
                if(err){
                    console.log(err);
                    deleteFile(filename);
                    reject(err)
                }
                deleteFile(file).then(result=>{
                    resolve(req.body.file)
                }).catch(error=>{
                    console.log(error);
                    reject(error)
                })
            })
        }).catch(e => {
            console.log(e);
            console.log('error download image');
            reject(e)
        });
        setTimeout(()=>{
            reject(new Error('time out'))
        }, 10000)
    })
};

Parser.prototype._sendArticle = async function(url){
    try{
        let title = await this.getArticleTheme();
        title += '\n' + url;
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
    }catch(e){
        return e
    }
};

Parser.prototype.everySecond = async function () {
    let value = await db.Parser.findOrCreate({
        where: {
            key: this.dataForEverySecond
        },
        defaults: {
            key: this.dataForEverySecond,
            value: 0
        }
    });
    let current = parseInt(value[0].value);
    let dict = {
        0: true,
        1: false
    };
    if(dict[current]){
        await this.start();
        value[0].update({value: 1})
    }else{
        console.log('false');
        value[0].update({value: 0})
    }
};

module.exports = Parser;
