/**
 * Created by Administrator on 2016/4/8.
 */
module.exports=GameRoom;

var Member=require('./member');


function GameRoom(){
    var self=this;
    self.members=[];//�����ڵ�������
   
    self.waiters=[];//������Ϸ��ʼ�󷿼��ڵȴ������

    self.MAX_MEMBER=4;//�涨����������ͬʱ��Ϸ
}

//�ж��Ƿ������˶�׼������
GameRoom.prototype.isAllReady=function(){
    var self=this;
    return self.members.every(function(member){
        return member.readyState==true;
    })
};

GameRoom.prototype.addMember=function(opts){
    var self=this;
    if(self.members.every(function(member){
            return opts.id!=member.id;
        })){
        var newMember=new Member(opts);
        self.members.push(newMember);
        console.log("add a member successful!");
    }else{
        console.log("refuse to add a repeated member");
    }
};

GameRoom.prototype.deleteMember=function(id){
    var self=this;
    var index=self.members.findIndex(function(member){
        return id==member.id;
    });
    if(index!=-1){
        self.members.splice(index,1);
        console.log("delete member succesful");
    }else{
        console.log("delete member failed:don't exist");
    }

};