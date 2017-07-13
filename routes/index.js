var express = require('express');
var router = express.Router();
var request = require('request');
var ch = require('cheerio');
var method = require('../startParser');
var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;

router.get('/', function(req, res, next) {
    res.json({result: true})
});
//14400000
module.exports = router;



