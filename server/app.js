var express = require('express');
var app = express();
var pg = require('pg'); // npm install pg --save
var conString = "tcp://postgres:admin@localhost:5432/bowen"; // 连接字符串="tcp:// 用户名 : 密码 @localhost:5432/ 库名";
var client = new pg.Client(conString);

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});


// 连接数据库
client.connect(function(error, results) {
    if (error) {
        console.log('ClientConnectionReady Error: ' + error.message);
        client.end();
        return;
    }
    console.log('Connecting to postgres success...');
});
app.get('/',function(req,res){
    var args = require('url').parse(req.url.toLowerCase(), true);
    var id = args.query.id;
    var query = client.query("select ST_AsGeoJson(geom) from \"waterways\" where osm_id='"+id+"'",function(err,result){
        if(err){
            res.end("false")
        }else{
            res.end(JSON.stringify(result.rows[0]))
        }
    });
});
var server = app.listen(5000, function () {
    var port = server.address().port;
    console.log('Example app listening at http://localhost:%s/?id=4045566', port);
});
