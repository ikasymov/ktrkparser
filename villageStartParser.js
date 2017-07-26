let request = require('request');
let Parser = require('./parser');
let errors = require('./errors');
let methods = require('./methods');
let client = require('redis').createClient('redis://h:pd4c104be5ed6b00951dd5c0f8c7461f66790fc55dde2d58612b10a98bb2e5a20@ec2-34-230-117-175.compute-1.amazonaws.com:28789');


function Vilage