let cron = require('node-cron');
let glob = require('glob');
let async = require('async');
let dirs = glob.sync('./parser/*.js');

function logic(dir){
    let value = require(dir)
    return  value.start;
}
async.map(dirs, logic, (error, result)=>{
    if(!error){
        console.log(result);
    }else{
        console.log(error);
    }
});