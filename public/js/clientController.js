/**
 * Created by Administrator on 2016/4/9.
 */

function EventEmitter(){
    var self=this;
    self.events={};
}

EventEmitter.prototype.emit=function(eventName,_){
    var self=this;
    if(!self.events[eventName]){
        console.log("event error:the callback doesn't exist");
        return;
    }
    var arg=Array.prototype.slice.call(arguments,1);
    self.events[eventName].forEach(function(callback){
        callback.apply(null,arg);  //»·¾³Îªdocument
    })
};

EventEmitter.prototype.on=function(eventName,callback){
    var self=this;
    self.events[eventName]=self.events[eventName]||[];
    self.events[eventName].push(callback);
};

function ClientController(server){
    var self=this;

    self.name="player";
    self.id=null;
    self.readyState=false;
    self.handCards=[];

    self.room=new GameRoom({
        "name":"player",
        "readyState":false,
        "role":"unknown"
    });

    self.socket=new WebSocket(server);
    self.socket.onopen=function(){
        self.socket.send(JSON.stringify({
            "action":"init",
            "name":self.name,
            "readyState":false,
            "role":"unknown"
        }));
        console.log("send initial message");
    };
    self.socket.onerror=function(err){

    };
    self.socket.onmessage=function(message){
        message=JSON.parse(message.data);
        if(!message.type){
            console.log("error message:no messaage type");
        }else{
            if( message.type=="member_in"){
                if(message.id!=self.id){
                    console.log("new member"+message.id+"in the room");
                    self.room.addMember(message);
                    self.emit('member_in',message);
                }
            }else if( message.type=="member_out"){
                console.log("member"+message.id+"go out the room");
                self.room.deleteMember(message.id);
                self.emit('member_out',message);
            }else if( message.type=="member_ready"){
                console.log("member"+message.id+"is ready");
                var member=self.room.members.find(function(member){
                    return member.id==message.id;
                });
                if(member!=undefined){
                    member.readyState=true;
                    console.log("set ready state successful");
                    self.emit('member_ready',message);
                }
            }else if( message.type=="member_unready"){
                console.log("member"+message.id+"cancel ready");
                var member=self.room.members.find(function(member){
                    return member.id==message.id;
                });
                if(member!=undefined){
                    member.readyState=false;
                    self.emit('member_unready',message);
                }
            }else if( message.type=="ack_prepare"){
                console.log("receive id,then we can see the ready button");
                self.id=message.id;
                self.room.members[0].id=message.id;
                self.emit('ack_prepare',message);
            }else if( message.type=="start"){
                self.emit('start',message);
                console.log("game start");
            }else if( message.type=="reject_in"){
                self.emit('reject_in',message);
                console.log("the game is on,wait for a minute");
            }else if(message.type=="role_set"){
                self.room.members.forEach(function (member) {
                    if(member.id!=message.dealerID){
                        member.role="idler";
                    }else{
                        member.role="dealer";
                    }
                });
                if(self.id==message.dealerID){
                    self.role="dealer";
                }else{
                    self.role="idler";
                }
                self.emit("role_set");
                console.log("set role successfully");
            }else if(message.type=="send_card"){
                console.log("receive a card");
                self.handCards.push(message.card);
                var me=self.room.members.find(function(member){
                    return self.id==member.id;
                });
                me.handCards.push(message.card);
                self.emit("send_card",message.card);
            }else if(message.type=="member_receiveCard"){
                console.log("someone get a new card");
                var member=self.room.members.find(function(member){
                    return  member.id==message.id;
                });
                member.handCards.push(message.card);
                self.emit("member_receiveCard",message);
            }else if(message.type=="hitOrStand"){
                console.log("the server ask me to choose hit or stand");
                self.emit("hitOrStand");
            }else if(message.type=="cancel_hitOrStand"){
                console.log("the server leave me");
                self.emit("cancel_hitOrStand");
            }else if(message.type=="others_hitOrStand"){
                console.log("the server start to ask others");
                self.emit("others_hitOrStand",message);
            }else if(message.type=="cancel_othersHitOrStand"){
                console.log("the server leave the played he was asking");
                self.emit("cancel_othersHitOrStand",message);
            }else if(message.type=="final_state"){
                console.log("receive the final state");
                var mem=self.room.members.find(function(member){
                    return member.id==message.id;
                });
                mem.finalState=message.finalState;
                if(message.id==self.id){
                    self.emit("final_state",mem);
                }
            }else if(message.type=="clean"){
                self.readyState=false;
                self.role=null;
                self.handCards=[];
                self.finalState=null;
                self.emit("clean");
            }
        }

    };
    self.socket.onclose=function(){
        console.log("the websocket is closed");
    };
}

ClientController.prototype = new EventEmitter();