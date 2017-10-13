let Xray = require('x-ray');
let x = Xray();
let request = require('request');
let config = require('./user_config');


module.exports = function(url, group){
  return new Promise((resolve, reject)=>{
    if(!group){
      x(url.html, 'title')((error, title)=>{
        sendArticle(title + '\n\n' + url.url, url.group).then(result=>{
          resolve(result)
        })
      })
    }
    x(url, 'title')((error, title)=>{
      sendArticle(title + '\n\n' + url, group).then(result=>{
        resolve(result)
      })
    })
  });
};

let nambaone = 'https://api.namba1.co';


async function generateToken(){
  let data = {
    url: nambaone + '/users/auth',
    method: 'POST',
    body: {
      'phone': config.user,
      'password': config.password
    },
    json: true
  };
  return new Promise((resolve, reject)=>{
    request(data, (error, req, body)=>{
      if(error || req.statusCode === 404){
        reject(error || new Error('page not found'))
      }
      resolve(body.data.token)
    })
  })
}

async function sendArticle(title, group){
  let token = false;
  try{
    token = await generateToken();
  }catch(e){
    return e
  }
  let dataForSend = {
    url:  nambaone + '/groups/' + group +'/post',
    method: 'POST',
    body: {
      content: title,
      comment_enabled: 1
    },
    headers: {
      'X-Namba-Auth-Token': token,
    },
    json: true
  };
  return new Promise((resolve, reject)=>{
    request(dataForSend, (error, req, body)=>{
      if(error || req.statusCode === 404){
        reject(error || new Error('not page found'));
      }
      console.log('send');
      resolve(req.statusCode);
    });
  });
};