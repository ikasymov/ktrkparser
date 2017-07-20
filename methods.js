var request = require('request'),
    superagent = require('superagent');
    fs = require('fs');

module.exports = {
    saveImageAndReturnToken: function (imgUrl, callback) {
          var value = Math.random();
          request(imgUrl).pipe(fs.createWriteStream('./' + 'kp' +  value + '.jpg')).on('finish', function (error, req) {
              if (error){
                  console.log(error)
              }
              superagent.post('https://files.namba1.co').attach('file', './' + 'kp' +  value + '.jpg').end(function(err, req) {
                  fs.unlink('./' + 'kp' +  value + '.jpg', function (error, value) {});
                  callback(req.body.file)
              });
          });
      },
    getAuthToken: function (callback) {
        var data = {
            url: 'https://api.namba1.co/users/auth',
            method: 'POST',
            body: {
                'phone': '996121121121',
                'password': 'password112'
            },
            json: true
        };
        request(data, function (error, req, body) {
            if (error || req.statusCode === 404){
                console.log('Error get auth token');
                callback('error')
            }else{
                callback(body.data.token)
            }
        })
    },
    regex: /(?:&nbsp;|<br>)|(?:&ndash;|<br>)|(?:&raquo;|<br>)|(?:&laquo;|<br>)|(?:&ldquo;|<br>)|(?:&rdquo;|<br>)|(?:&mdash;|<br>)|(?:&nbs;|<br>)|(?:&rsquo;|<br>)|(<([^>]+)>)/g
};