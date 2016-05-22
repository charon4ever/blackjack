/**
 * Created by Administrator on 2016/4/11.
 */
module.exports=Card;

function Card(opts) {
    var self=this;
    self.point=opts.point;
    self.color=opts.color;
    self.number=opts.number;
}