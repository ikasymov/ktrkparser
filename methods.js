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
  }
};