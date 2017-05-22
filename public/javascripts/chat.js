/**
 * Created by Administrator on 2017/3/24.
 */
//客户端js类chat，处理聊天命令，发送消息，请求变更房间或昵称
var Chat=function (socket) {
    this.socket=socket;
};
//发送消息的方法
Chat.prototype.sendMessage=function (room, text) {
    console.log('准备发送消息'+text);
    var message={
        room:room,
        text:text
    };
    this.socket.emit('message',message);
    console.log('要发送消息为'+text);
};
//变更房间的方法
Chat.prototype.changeRoom=function (room) {
    this.socket.emit('join',{
        newRoom:room
    });
};
//处理聊天命令，join加入或创建房间，nick修改昵称
Chat.prototype.processCommand=function (command) {
    var words=command.split(' ');
    var command=words[0].substring(1,words[0].length).toLowerCase();
    var message=false;
    switch (command){
        case 'join':
            words.shift();//Array.shift()函数删除数组第一个元素，并将该元素返回，会改变数组的长度
            var room=words.join(' ');
            this.changeRoom(room);
            break;
        case 'nick':
            words.shift();
            var name=words.join(' ');
            this.socket.emit('nameAttempt',name);
            break;
        default:
            message='这个命令也是屌了，小宝没看懂';
            break;
    }
    return message;
};

