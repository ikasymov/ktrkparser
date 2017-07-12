var express = require('express');
var router = express.Router();
var request = require('request');
var ch = require('cheerio');

var xpath = require('xpath'),
    dom = require('xmldom').DOMParser;

