/**
 * Created by Administrator on 2016/4/9.
 */

function GameRoom(opts){
    var self=this;
    self.members=[];//�����ڵ�������
    self.members[0]=new Member(opts);

    self.waiters=[];//������Ϸ��ʼ�󷿼��ڵȴ������

    self.MAX_MEMBER=4;//�涨����������ͬʱ��Ϸ
}

GameRoom.prototype.addMember=function(opts){
    var self=this;
    if(self.members.every(function(member){
            return opts.id!=member.id;
        })){
        var newMember=new Member(opts);
        self.members.push(newMember);
        console.log("add a member successful");
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
