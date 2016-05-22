/**
 * Created by Administrator on 2016/4/8.
 */
module.exports=Cards;

var Card=require("./card");

function Cards(){
    var self=this;
    self.currentCards=[];
    var lib=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    for(var i=0;i<13;i++){
        var num=i+1;
        var newCard=new Card({
            "point":lib[i],
            "color":"hearts", //红心
            "number":num
        });
        self.currentCards.push(newCard);

        newCard=new Card({
            "point":lib[i],
            "color":"spades", //黑桃
            "number":num
        });
        self.currentCards.push(newCard);

        newCard=new Card({
            "point":lib[i],
            "color":"diamonds", //方片
            "number":num
        });
        self.currentCards.push(newCard);

        newCard=new Card({
            "point":lib[i],
            "color":"club", //梅花
            "number":num
        });
        self.currentCards.push(newCard);
    }
}

Cards.prototype.dealNextCard=function(cb){
    var self=this;
    var index=Math.floor(Math.random()*self.currentCards.length);
    var nextCard=self.currentCards[index];
    self.currentCards.splice(index,1);
    cb(nextCard);
};