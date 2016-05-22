/**
 * Created by Administrator on 2016/4/8.
 */
module.exports=Member;

function Member(opts){
    var self=this;
    self.name=opts.name || null;
    self.readyState=false;
    self.id=opts.id ;//唯一表示玩家的ID号，由服务器分配并发给玩家
    self.socket=opts.socket;
    self.role=opts.role;
    self.handCards=[];
    self.finalState=null;
    self.sum=null;
}

Member.prototype.isBust=function(){
    var self=this;
    var sum=0;
    self.handCards.forEach(function(handCard){
        if(handCard.number>1&&handCard.number<11){
            sum=sum+handCard.number;
        }else if(handCard.number>10&&handCard.number<14){
            sum+=10;
        }else if(handCard.number==0){
            if(sum+1>21){
                return ture;
            }else if(sum+10>21){
                sum+=1;
            }else {
                sum += 10;
            }
        }else{
            console.log("invalid card number,discard it");
        }
    });
    return (sum>21);
};

Member.prototype.handSum=function(){
    var self=this;
    var sum=0;
    self.handCards.forEach(function (handCard) {
        if(handCard.number>1&&handCard.number<11){
            sum=sum+handCard.number;
        }else if(handCard.number>10&&handCard.number<14){
            sum+=10;
        }else if(handCard.number==0){
            if(sum+1>21){
                sum+=1;
            }else if(sum+10>21){
                sum+=1;
            }else {
                sum += 10;
            }
        }else{
            console.log("invalid card number,discard it");
        }
    });
    return sum;
};
