/**
 * Created by Administrator on 2016/4/8.
 */
var express=require('express');
var GameController=require('./lib/gameController');
var path=require('path');

//¾²Ì¬·þÎñÆ÷
var app=express();
app.listen(3000);
app.use(express.static(path.join(__dirname,'public')));
app.get('/',function(req,res){
    res.sendfile(__dirname + '/index.html');
});

var controller=new GameController();
controller.start();

