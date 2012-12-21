var express = require('express');
var app = express();

app.use('/static', express.static(__dirname + '/www/static'));

app.get('/', function(req, res){
  res.sendfile('www/index.html');
});

app.listen(3000);

exports = app;