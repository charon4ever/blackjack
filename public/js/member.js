/**
 * Created by Administrator on 2016/4/9.
 */
function Member(opts){
    var self=this;
    self.name=opts.name || null;
    self.id=opts.id;
    self.readyState=false;
    self.role=opts.role
    self.handCards=[];
}