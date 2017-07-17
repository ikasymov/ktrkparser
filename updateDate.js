var client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');

// client.set('last_news_kg', 14727);
// client.set('last_news_ru', 14727);
// client.set('kp_news', 2805748);
client.get('last_news_ru', function (error, value) {
   console.log(value)
});
// client.set('', 14684);