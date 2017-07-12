var express = require('express');
var router = express.Router();
var request = require('request');
var ch = require('cheerio');

var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;

var client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');
router.get('/', function(req, res, next) {
    res.json({result: true})
});
//14400000
module.exports = router;
