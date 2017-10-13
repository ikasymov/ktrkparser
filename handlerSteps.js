let db = require('./models');

function Handler(list, key){
  this.list = list;
  this.key = key
}

Handler.prototype.getUrl =  async function(){
  let lastUrl = await db.Parser.findOrCreate({
    where:{
      key: this.key
    },
    defaults:{
      key: this.key,
    }
  });
  let firstUrl = this.list.slice(-1)[0];
  if(firstUrl !== lastUrl[0].value){
    await lastUrl[0].update({value: firstUrl});
    return firstUrl
  }
  console.log('not send')
  return false
};

module.exports = Handler;