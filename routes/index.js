var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.json({result: true})
});
//14400000
module.exports = router;



