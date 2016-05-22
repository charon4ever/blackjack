/**
 * Created by Administrator on 2016/4/8.
 */
module.exports=GameController;

var WebSocket=require('ws').Server;
var Http = require('http');
var GameRoom=require('./gameRoom');
var Cards=require('./cards');

function GameController(){
    var self=this;

    /***http server***/
    self.http = Http.createServer();

    self.http.on('error', function(err){
        self.onError(err)
    });
    self.http.on('listening',function(){
        console.log("listening on port 9090 on this server");
    });

    /***websocket server***/
    self.websocket=new WebSocket({ server: self.http});
    self.websocket.on('connection',function(socket){
        self.onWebSocketConnection(socket);
        console.log("receive connection");
    });
    self.websocket.on('error',function(err){
        self.onError(err);
    });

    self.sockets=[];//存储所有的套接字

    self.currentState="preparing";//控制器维护一个全局状态变量，以防止新节点贸然加入。

    self.room=new GameRoom();

    self.cards=null; //记得每局结束要清空cards

    self.id=0;//id生成器

    self.turnID=null;//记录当前服务器在和哪个玩家交流
    self.turnIndex=null;

    self.NEXTTIME=30000;//设定玩家每回合时间倒计时，超时则服务器转向新的玩家，默认为30秒
    self.RESTARTTIME=10000;//设定重新开局的等待时间
}

GameController.prototype.start=function(){
    var self=this;
    self.http.listen(9090);
    /*self.room.members.forEach(function(member){
        member.socket.send({
            type:"ack_prepare"
        });
    });*/
};

GameController.prototype.onError=function(err){

};

GameController.prototype.onWebSocketClose=function(socket){
    var self=this;
    console.log(socket.id+"leave the room");
    var outerID=socket.id;
    self.room.deleteMember(outerID);
    var index=self.sockets.findIndex(function(socket) {
        return outerID==socket.id;
    });
    self.sockets.splice(index,1);
    self.sockets.forEach(function(socket){
        socket.send(JSON.stringify(
            {
                "type":"member_out",
                "id":outerID
            }
        ));
    });
    if(self.currentState=='start'){

    }
};

GameController.prototype.onWebSocketRequest=function(socket,message){
    var self=this;
    message=JSON.parse(message);
    if(!message.action){
        console.log("invalid request:no action field");
    }else{
        if( message.action=='init'){
            if(self.room.members.length<=self.room.MAX_MEMBER){
                console.log("new player,come in");
                self.room.addMember({
                    "socket":socket,
                    "name":message.name,
                    "id":self.id,
                    "role":message.role
                });
                socket.id=self.id;
                var newComerID=socket.id;
                self.sockets.forEach(function(socket){
                    if(socket.id!=newComerID){
                        socket.send(JSON.stringify({
                            "type":"member_in",
                            "name":message.name,
                            "id":newComerID,
                            "readyState":false,
                            "role":message.role
                        }));
                    }
                });
                self.room.members.forEach(function(member){
                    if(member.id!=newComerID){
                        socket.send(JSON.stringify({
                            "type":"member_in",
                            "name":member.name,
                            "id":member.id,
                            "readyState":member.readyState,
                            "role":member.role
                        }));
                    }
                });

                if(self.currentState=='preparing'){
                    socket.send(JSON.stringify({
                        "type":"ack_prepare",
                        "id":newComerID
                    }));//如果服务器处于prepare状态，同意玩家进行准备，否则不理玩家，等待下一轮开始时对所有member发出邀请
                }
                self.id++;
            }else{
                socket.send(JSON.stringify({
                    "type":"reject_in"
                }));
                console.log("the room is full,reject in");
            }
        }else if(message.action=='ready'){
            if(self.currentState=="preparing"){
                var index=self.room.members.findIndex(function(member){
                    return member.id==message.id;
                });
                self.room.members[index].readyState=true;
                console.log("member"+index+"is ready");
                self.sockets.forEach(function(socket){
                    if(socket.id!=message.id){
                        socket.send(JSON.stringify({
                            "type":"member_ready",
                            "name":message.name,
                            "id":message.id
                        }));
                    }
                });

                if(self.room.members.length>=2&&self.room.isAllReady()){//两人以上准备好即开始游戏
                    self.currentState="start";
                    console.log("all the members are ready,start the game");
                    self.sockets.forEach(function(socket){
                        socket.send(JSON.stringify({
                            "type":"start"
                        }));
                    });
                    self.setRole();
                }
            }else{

            }

        }else if( message.action=='unready'){
            var index=self.room.members.findIndex(function(member){
                return member.id==message.id;
            });
            self.room.members[index].readyState=false;
            console.log("member"+index+"cancel ready");
            self.sockets.forEach(function(socket){
                if(socket.id!=message.id){
                    socket.send(JSON.stringify({
                        "type":"member_unready",
                        "name":message.name,
                        "id":message.id
                    }));
                }
            })
        }else if(message.action=="choose"){
            if(message.id!=self.turnID){
                console.log("the choose is invalid,discard it");
            }else{
                //self.nextTurnTimeOut.unref();
                clearTimeout(self.nextTurnTimeOut);
                console.log("the choose is from the idler");
                self.handleIdlerChoose(message);
            }
        }
    }
};

GameController.prototype.onWebSocketError=function(socket,error){

};

GameController.prototype.onWebSocketConnection=function(socket){
    var self=this;

    console.log('websocket connect from:'+JSON.stringify(socket.id));
    self.sockets.push(socket);
    socket.on('error',self.onWebSocketError.bind(self,socket));
    socket.on('message',self.onWebSocketRequest.bind(self,socket));
    socket.on('close',self.onWebSocketClose.bind(self,socket));
};

//给牌桌上的玩家设立身份
GameController.prototype.setRole=function(){
    var self=this;
    var dealerIndex=Math.floor(Math.random()*self.room.members.length);
    self.room.members.forEach(function(member){
        member.role="idler";
    });
    self.room.members[dealerIndex].role="dealer";
    console.log("member"+dealerIndex+"is the dealer,others are idlers");
    var dealerID=self.room.members[dealerIndex].id;
    self.sockets.forEach(function (socket){
       socket.send(JSON.stringify({
           "type":"role_set",
           "dealerID":dealerID
       }));
    });
    console.log('send role info to everyone');
    self.dealCards();
};

//发牌
GameController.prototype.dealCards=function(){
    var self=this;
    self.cards=new Cards();
    self.room.members.forEach(function(member){
        self.cards.dealNextCard(function(card){
            member.handCards.push(card);
            member.socket.send(JSON.stringify({
                "type":"send_card",
                "card":card
            }));
            self.sockets.forEach(function(socket){
                if(socket.id!=member.id){
                    socket.send(JSON.stringify({
                        "type":"member_receiveCard",
                        "card":card,
                        "id":member.id
                    }));
                }
            });
        });
        self.cards.dealNextCard(function(card){
            member.handCards.push(card);
            member.socket.send(JSON.stringify({
                "type":"send_card",
                "card":card
            }));
            self.sockets.forEach(function(socket){
                if(socket.id!=member.id){
                    socket.send(JSON.stringify({
                        "type":"member_receiveCard",
                        "card":card,
                        "id":member.id
                    }));
                }
            });
        });
    });
    console.log("send two cards  to each person");
    self.dealerLogic();
};

GameController.prototype.dealerLogic=function(){
    var self=this;
    self.turnIndex=self.room.members.findIndex(function(member){
        return member.role=="dealer";
    });
    self.turnID=self.dealerID=self.room.members[self.turnIndex].id;
    console.log('the turn is now'+self.turnID);

    for(var i=0;i<self.room.members.length;i++){
        if(i==self.turnIndex){
            self.room.members[i].socket.send(JSON.stringify({
                "type":"hitOrStand"
            }));
        }else{
            self.room.members[i].socket.send(JSON.stringify({
                "type":"others_hitOrStand",
                "id":self.dealerID
            }))
        }
    }

    while(self.room.members[self.turnIndex].handSum()<16){
        self.cards.dealNextCard(function(card){
            self.room.members[self.turnIndex].handCards.push(card);
            self.room.members[self.turnIndex].socket.send(JSON.stringify({
                "type":"send_card",
                "card":card
            }));
            self.sockets.forEach(function(socket){
                if(socket.id!=self.dealerID){
                    socket.send(JSON.stringify({
                        "type":"member_receiveCard",
                        "card":card,
                        "id":self.dealerID
                    }));
                }
            });
        });
    }

    if(self.room.members[self.turnIndex].isBust()){
        console.log("the dealer is bust");
        for(var i=0;i<self.room.members.length;i++){
            if(i==self.turnIndex){
                self.room.members[i].socket.send(JSON.stringify({
                    "type":"bust"
                }));
            }else{
                self.room.members[i].socket.send(JSON.stringify({
                    "type":"others_bust",
                    "bustID":self.room.members[self.turnIndex].id
                }))
            }
        }
    }
    console.log("the dealer complete his game");
    self.room.members[self.turnIndex].socket.send(JSON.stringify({
        "type":"cancel_hitOrStand"
    }));
    console.log("stop sending cards to dealer");
    self.sockets.forEach(function(socket){
        if(socket.id!=self.dealerID){
            socket.send(JSON.stringify({
                "type":"cancel_othersHitOrStand",
                "id":self.dealerID
            }));
        }
    });
    console.log("ask idlers to hit or stand");
    self.nextHitOrStand();//庄家无法做选择，直接发完牌跳到下一个玩家

};

GameController.prototype.nextHitOrStand=function(){
    var self=this;
    self.turnIndex=(self.turnIndex+1)%self.room.members.length;
    self.turnID=self.room.members[self.turnIndex].id;
    if(self.turnID!=self.dealerID){
        console.log('the turn is now'+self.turnID);
        if(self.room.members[self.turnIndex].handSum()!=21){
            for(var i=0;i<self.room.members.length;i++){
                if(i==self.turnIndex){
                    self.room.members[i].socket.send(JSON.stringify({
                        "type":"hitOrStand"
                    }));
                }else{
                    self.room.members[i].socket.send(JSON.stringify({
                        "type":"others_hitOrStand",
                        "id":self.room.members[self.turnIndex].id
                    }))
                }
            }

            self.nextTurnTimeOut=setTimeout(function(){
                self.nextHitOrStand();
            },self.NEXTTIME);
            if(self.nextTurnTimeOut.unref)self.nextTurnTimeOut.unref();
        }else{
            console.log("member"+self.turnID+"got blackjack,turn to next");
            self.nextHitOrStand();
        }


    }else{
        console.log("the main logic is over,let's calculate the result");
        self.handleResult();
    }

};

GameController.prototype.handleIdlerChoose=function(message){
    var self=this;
    if(message.choose=="hit"){
        self.cards.dealNextCard(function(card){
            self.room.members[self.turnIndex].handCards.push(card);
            self.room.members[self.turnIndex].socket.send(JSON.stringify({
                "type":"send_card",
                "card":card
            }));
            self.sockets.forEach(function(socket){
                if(socket.id!=self.turnID){
                    socket.send(JSON.stringify({
                        "type":"member_receiveCard",
                        "card":card,
                        "id":self.turnID
                    }));
                }
            });
            if(self.room.members[self.turnIndex].isBust()){
                console.log("member"+self.turnIndex+"is bust");
                for(var i=0;i<self.room.members.length;i++){
                    if(i==self.turnIndex){
                        self.room.members[i].socket.send(JSON.stringify({
                            "type":"bust"
                        }));
                        self.room.members[i].socket.send(JSON.stringify({
                            "type":"cancel_hitOrStand"
                        }));
                    }else{
                        self.room.members[i].socket.send(JSON.stringify({
                            "type":"others_bust",
                            "bustID":self.room.members[self.turnIndex].id
                        }));
                        self.room.members[i].socket.send(JSON.stringify({
                            "type":"cancel_othersHitOrStand",
                            "id":self.room.members[self.turnIndex].id
                        }));
                    }
                }
                self.nextHitOrStand();
            }else{
                self.room.members[self.turnIndex].socket.send(JSON.stringify({
                    "type":"hitOrStand"
                }));
                console.log("wait for the new answer...");
                self.nextTurnTimeOut=setTimeout(function(){
                    self.nextHitOrStand();
                },self.NEXTTIME);
                if(self.nextTurnTimeOut.unref)self.nextTurnTimeOut.unref();
            }
        });
    }else if(message.choose=='stand'){
        for(var i=0;i<self.room.members.length;i++){
            if(i==self.turnIndex){
                self.room.members[i].socket.send(JSON.stringify({
                    "type":"cancel_hitOrStand"
                }));
            }else{
                self.room.members[i].socket.send(JSON.stringify({
                    "type":"cancel_othersHitOrStand",
                    "bustID":self.room.members[i].id
                }));
            }
        }
        self.nextHitOrStand();
    }
};

GameController.prototype.handleResult=function () {
    var self=this;
    var maxPoint=0;
    self.room.members.forEach(function(member){
        member.sum=member.handSum();
    });
    self.room.members.filter(function(member){
        return  member.sum<=21;
    }).forEach(function(member){
        if (member.sum>maxPoint){
            maxPoint=member.sum;
        }
    });
    console.log("maxpoint:"+maxPoint);
    self.room.members.forEach(function (member){
        if(member.sum==maxPoint){
            member.finalState="you win";
        }else{
            member.finalState="you lose";
        }
    });
    self.room.members.forEach(function(member){
        for(var i=0;i<self.room.members.length;i++){
            member.socket.send(JSON.stringify({
                "type":"final_state",
                "finalState":self.room.members[i].finalState,
                'id':self.room.members[i].id
            }));
        }
    });
    console.log("send final states,start another game");
    
    setTimeout(function () {
        self.clean();
    },self.RESTARTTIME)
};

GameController.prototype.close=function(){
    var self=this;
};

//todo 这个方法非常重要！把所有需要清零的变量清零
GameController.prototype.clean=function(){
    var self=this;
    self.cards=null;

    self.turnID=self.dealerID=null;
    self.turnIndex=null;
    self.currentState="preparing";

    self.room.members.forEach(function(member){
        member.readyState=false;
        member.role=null;
        member.handCards=[];
        member.finalState=null;
        member.sum=null;
    });
    self.room.members.forEach(function (member) {
        member.socket.send(JSON.stringify({
            "type":"clean"
        }));
    });
};

//todo 完善服务器状态机，所有请求到来一律查询与状态是否相符