/**
 * Created by Administrator on 2017/3/24.
 */
var socketio=require('socket.io');
var io;
var guestNumber=1;
var nickNames={};//存放昵称，并与客户端连接ID关联--->key->socket.id...value->nickname:
var namesUsed=[];//存放已经被占用的昵称
var currentRoom={};//记录用户当前房间---->key->socket.id...value->room
var currentObj={};//记录用户当前代表的数据库中的对象---->key->socket.id...value->obj
var count_up=0;//记录在线的总人数，用以动态查询单个性别的人数后求得另一性别人数
// var matchRooms=[]; //记录所有的匹配小房间
var total_m=0;
var blank_room=false;//记录其中可匹配的空房间名字
var parters_count=0;//记录当前是否有三人空位可插入，0代表不可插，1,2,3代表可插，到4自动归零
var parters_name='G0';
var parter1='P1';
var parter2='P2';
var parter3='P3';
var User=global.mongoHandle.getModel('user');
var Parters=global.mongoHandle.getModel('parters');
var Shop=global.mongoHandle.getModel('shop');
//聊天服务器函数，用来启动Socket.io服务器，控制台输出，处理连接
exports.listen=function (server) {
    io=socketio.listen(server);//    启动Socket.io服务器，允许他搭载在已有的http服务器上
    console.log('chat_server聊天服务器模块开始监听哦');
    io.set('log level',1);
    // var nsp=io.of('/xbao-space');
    io.on('connection',function (socket) {//定义每个用户连接的处理逻辑
        socket.leave(socket.id);
        // socket.id=++total;
        handleConnect(socket);
        // assignGuestName(socket,guestNumber++,nickNames,namesUsed);//在用户连接上来时，赋予其一个访客名\
        handleConfig(socket);//处理用户更改配置
        handleMatch(socket);//处理游客的随机匹配
        handleBreak(socket);//处理游客随机匹配又断开匹配
        handleParterMatch(socket);//处理小组成员匹配回复小组的按钮
        handleParterBreak(socket);//处理小组成员退出小组
        handlePosterMatch(socket);//处理楼主查到库中所有可用小组并返回
        // joinRoom(socket,'xbao');
        handleMessageBroadcasting(socket,nickNames);//处理用户的消息
        handleNameChangeAttempts(socket,nickNames,namesUsed);//聊天室的创建与变更
        handleRoomJoining(socket);
        socket.on('rooms',function () {
            socket.emit('rooms',io.sockets.adapter.rooms);//用户发出请求时，向其提供已经被占用的聊天室列表
        });
        
        handleClientDisconnection(socket,nickNames,namesUsed);
    });
};
function handleConnect(socket) {
    socket.on('client_join',function (result) {
        if(result.role=='tourist'){
            assignGuestName(socket,guestNumber,nickNames,namesUsed);
            console.log('---------游客身份进入----------------');
        }else {
            currentObj[socket.id]=result.client;
            let client_name=result.client.nickname;
            nickNames[socket.id]=client_name;
            //用户昵称与客户端连接id关联
            socket.emit('nameResult',{//让用户知道他们的昵称
                success:true,
                name:client_name
            });
            namesUsed.push(client_name);
            updateCount();
            console.log('---------认证身份进入----------------');
            console.log('---------宝宝的身份为'+result.role+'----------------');
            if(result.role=='parter'){
                Parters.find({$or:[{parter1:client_name},{parter2:client_name},{parter3:client_name}]},function (err,docs) {
                    if (err){
                        console.log(err);
                    }else {
                        for (doc of docs){
                            joinRoom(socket,doc.parters_name);
                        }
                    }
                });
            }else if(result.role=='poster'){
                Shop.find({poster:client_name},function (err, docs) {
                    if(err){
                        console.log(err);
                    }else {
                        for (doc of docs){
                            joinRoom(socket,doc.parters_name);
                        }
                    }
                })
            }
        }
    })
}
//分配用户昵称
function assignGuestName(socket,guestNumber,nickNames,namesUsed) {
    let name_lib=['达康书记','育良书记','祁厅长','赵东来','检察长','林华华','欧阳菁',
        '王大陆','宇宙区长','小皮球','夏东海','赵立春','赵瑞龙','高小琴','高小凤'];
    let name_head=name_lib[Math.floor(Math.random()*name_lib.length)];
    let name_foot=Math.floor(Math.random()*22);
    let name=name_head+(guestNumber)+name_foot+'号';
    nickNames[socket.id]=name;
    socket.on('card_join',function (result) {
        let sex=result.sex;
        // let Tourist=global.mongoHandle.getModel('tourist');
        // let tourist=new User();
        // tourist.nickame=name;
        // tourist.sex=sex;
        // console.log('----------------get到sex为'+sex+'------------');
        // tourist.save(function (err) {
        //     if(err){
        //         throw err;
        //     }
        //     console.log('---------------------性别为'+sex+'的新游客'+name+'添加成功----------------------');
        // });
        User.create({nickname:name,sex:sex,status:'up'},function (err, doc) {
            if (err){
                console.log(err);
            }else {
                count_up++;
                console.log('---------------------性别为'+sex+'的新游客'+name+'添加成功----------------------');
                updateCount();
            }
        });
        let room=result.room;
        console.log('get-----------'+room);
        // result.chat_client.setNickname(name);
        joinRoom(socket,room);
        // nickNames[socket.id]=;
    });
   //用户昵称与客户端连接id关联
    socket.emit('nameResult',{//让用户知道他们的昵称
        success:true,
        name:name
    });
    namesUsed.push(name);
    // return guestNumber+1;
}
//处理用户更改设置--昵称或性别
function handleConfig(socket) {
    socket.on('save_info',function (result) {
        // let Tourist=global.mongoHandle.getModel('tourist');
        let old_name=result.old_name;
        let new_name=result.new_name;
        let sex=result.sex;
        User.findOne({nickname:new_name},function (err, doc) {
            if(err){
                console.log(err);
            }else if(doc){
                if(doc.name === old_name){
                    console.log("用户名没有变化~");
                    updateInfo(old_name,new_name,sex);
                }else{
                    console.log("用户名已存在");
                    // socket.emit("nameExists",uname);
                }
            }else{
                updateInfo(old_name,new_name,sex);
            }
        })
    })
}
//更新mongo中游客数据的方法
function updateInfo(old_name,new_name,sex) {
    User.update({nickname:old_name},{$set:{nickname:new_name,sex:sex}},function (err, doc) {
        if(err){
            console.log(err);
        }else {
            updateCount();
            console.log('----------------mongo数据更新准备-------------------');
            console.log('我把昵称为'+old_name+'的游客改为昵称：'+new_name+'性别：'+sex);
            console.log('----------------mongo数据更新完成-------------------');
        }
    });
}
//动态刷新在线的男女性别人数
function updateCount() {
    User.find({sex:'boy',status:'up'},function (err, docs) {
        let boy_count;
       if(err){
           console.log(err);
       } else {
           if(docs){
               boy_count=docs.length;
               User.find({sex:'girl',status:'up'},function (err, docs) {
                  if(err){
                      console.log(err);
                  }else {
                      if(docs){
                          let girl_count=docs.length;
                          io.sockets.emit('set_count',{
                              boy_count:boy_count,
                              girl_count:girl_count
                          });
                      }
                  }

               });
           }
       }
    });
}
//用户加入聊天室
function joinRoom(socket,room) {
    if(currentRoom[socket.id]){
        socket.leave(currentRoom[socket.id]);
    }
    socket.join(room);
    currentRoom[socket.id]=room;
    socket.emit('joinResult',{room:room});//让用户知道他进入了新的房间
    socket.broadcast.to(room).emit('message',{
        text:nickNames[socket.id]+'已经加入'+room+'了哦，么么哒！！！'
    });//让房间里其他用户知道有新用户加入了房间
    io.sockets.adapter.clients([room],function (err,clients) {
        if(err){
            throw err;
        }
        let length=Object.keys(clients).length;
        console.log(room+'房间内有'+length+'个用户----------------------------->');
        if(length>1) {//如果不止一个用户在当前房间，汇总一下其他用户
            let usersInRoomSummary = '当前在' + room + '房间内的用户有：';
            for (var index in clients) {
                console.log(room + '房间内有' + clients[index]);
                var userSocketId = clients[index];
                if (userSocketId != socket.id) {
                    if (index > 0) {
                        usersInRoomSummary += ',';
                    }
                    if (nickNames[userSocketId]) {
                        usersInRoomSummary += nickNames[userSocketId];
                    }
                }
            }
            usersInRoomSummary += '嗯哼，就这些，啦啦啦';
            socket.emit('message', {text: usersInRoomSummary});
        }
    });//确定有哪些用户在这个房间里
    // var length=Object.keys(usersInRoom).length;
    // console.log(room+'房间内有'+length+'个用户----------------------------->');
    // if(length>1){//如果不止一个用户在当前房间，汇总一下其他用户
    //     var usersInRoomSummary='当前在'+room+'房间内的用户有：';
    //     for (var index in usersInRoom){
    //         console.log(room+'房间内有'+usersInRoom[index]);
    //         var userSocketId=usersInRoom[index].id;
    //         if(userSocketId!=socket.id){
    //             if(index>0){
    //                 usersInRoomSummary+=',';
    //             }
    //             if(nickNames[userSocketId])
    //             {
    //                 usersInRoomSummary+=nickNames[userSocketId];
    //             }
    //         }
    //     }
    //     usersInRoomSummary+='嗯哼，就这些，啦啦啦';
    //     socket.emit('message',{text:usersInRoomSummary});
    // }
}
//更名请求的处理逻辑
function handleNameChangeAttempts(socket,nickNames,namesUsed) {
    socket.on('nameAttempt',function (name) {
        if(name.indexOf('小宝')==0){
            socket.emit('nameResult',{
                success:false,
                message:'新名字不能以"小宝"开头哦，阿里嘎多!'
            });
        }else {
            if(namesUsed.indexOf(name)==-1){
                let previousName=nickNames[socket.id];
                let previousNameIndex=namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id]=name;
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult',{
                    success:true,
                    name:name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message',{
                    text:previousName+'现在改名为'+name+'了哦，小伙伴们'
                });
            }else {
                socket.emit('nameResult',{
                    success:false,
                    message:'真是可惜，您起的新名字已经被抢先了哦'
                });
            }
        }
    });
}
//服务端发送聊天消息
function handleMessageBroadcasting(socket) {
    socket.on('message',function (message) {
        socket.broadcast.to(message.room).emit('message',{
            text:nickNames[socket.id]+':'+message.text
        });
    });
}
//服务端处理用户切换房间
function handleRoomJoining(socket) {
    socket.on('join',function (room) {
       socket.leave(currentRoom[socket.id]);
       joinRoom(socket,room.newRoom,nickNames);
    });
}
//处理用户随机匹配
function handleMatch(socket) {
    socket.on('match',function () {
        // let room=checkRoom(matchRooms);
        // socket.leave(result.room);
        if(!blank_room){
            //如果room为false，即当前为第一次开始匹配，blank_room初始值null即为false，或所有的匹配房间均已满两个人
            let room_m='match'+(++total_m);
            // matchRooms.push(room_m);
            // block_room.push(room_m);
            blank_room=room_m;
            joinRoom(socket,blank_room);
            // socket.join(matchRooms[socket.id]);
            // currentRoom[socket.id]=matchRooms[socket.id];
            // joinRoom(socket,matchRooms[socket.id]);
        }else {
            joinRoom(socket,blank_room);
            // socket.join(room);
            // currentRoom[socket.id]=room;
            io.sockets.in(blank_room).emit('match_success');
            blank_room=false;
            // socket.emit('match_success',{room:room});
        }
        
        // for (var r in io.sockets.clients[result]){
        //
        // }
    });
}
//处理用户断开连接
function handleBreak(socket) {
    socket.on('break',function () {
        if(currentRoom[socket.id]){
            io.sockets.in(currentRoom[socket.id]).emit('break_success');
            io.sockets.adapter.clients([currentRoom[socket.id]],function (err, clients) {
                if(err){
                    throw err;
                }
                let length=Object.keys(clients).length;
                if(length>0){
                    for(let client of clients){
                        if(currentRoom[client]){
                            io.sockets.connected[client].leave(currentRoom[client]);
                        }
                    }
                }
            });
        }
    })
}
//设计小组成员3人匹配成一个小组部分
//获得一个随机的小组名的函数
function getRandomGroupName() {
    let name_source=['西红柿炒蛋','凉拌黄瓜','酸辣土豆丝','山药木耳','红烧肉','糖醋里脊','剁椒皮蛋',
        '凉拌西红柿','木须肉','地三鲜','宫保鸡丁','锅包肉','鱼香肉丝','酱牛肉','千叶豆腐','小炒肉',
        '莴笋炒肉','芦蒿香干','土豆牛肉','山药排骨','红烧排骨','红烧带鱼', '鲫鱼豆腐','小龙虾','小笼包',
        '灌汤包','烤冷面','炸酱面','酸辣粉','鸭血粉丝'];
    return 'G'+name_source[Math.floor(Math.random()*name_source.length)]+'N.'+Math.floor(Math.random()*122);
}
//处理小组成员的匹配安钮事件
function handleParterMatch(socket) {
    // let parters_name='G0';
    // let parter1='P1';
    // let parter2='P2';
    // let parter3='P3';
    socket.on('parter_match',function () {
        if(parters_count==0){
            parters_count++;
            parters_name=getRandomGroupName();
            joinRoom(socket,parters_name);
            parter1=nickNames[socket.id];
            console.log('parter'+parters_count+'加入了'+parters_name);
        }else if(parters_count>0&&parters_count<3){
            parters_count++;
            joinRoom(socket,parters_name);
            console.log('parter'+parters_count+'加入了'+parters_name);
            if(parters_count==2){
                parter2=nickNames[socket.id];
            }else if(parters_count==3){
                parter3=nickNames[socket.id];
                parters_count=0;
                Parters.create({parters_name:parters_name,parter1:parter1,parter2:parter2,parter3:parter3},function (err, doc) {
                    if (err){
                        console.log(err);
                    }else {
                        // count_up++;
                        io.sockets.in(parters_name).emit('parters_match_success');
                        console.log('---小组'+parters_name+'匹配完成，组内成员有'+parter1+'---'+parter2+'---'+parter3+'啦啦啦');
                        // updateCount();
                    }
                });
            }
        }
    });
}
//处理小组成员退出当前组
function handleParterBreak(socket) {
    socket.on('parter_break',function () {
        if(currentRoom[socket.id]){
            socket.leave(currentRoom[socket.id]);
            socket.emit('parter_break_success');
            // io.sockets.adapter.clients([currentRoom[socket.id]],function (err, clients) {
            //     if(err){
            //         throw err;
            //     }
            //     let length=Object.keys(clients).length;
            //     if(length>0){
            //         for(let client of clients){
            //             if(currentRoom[client]){
            //                 io.sockets.connected[client].leave(currentRoom[client]);
            //             }
            //         }
            //     }
            // });
        }
    })
}
//处理楼主点击选择小组按钮并显示出3d房间盒子后，查mongo库可用的parters_room信息，并打到3dUI上
function handlePosterMatch(socket) {
    //处理楼主点击选择按钮，查库并返回所有可用小组
    socket.on('poster_match',function () {
        Parters.find({available:true},function (err, docs) {
            // let parters_room_count;
            if(err){
                console.log(err);
            } else {
                if(docs){
                    // parters_room_count=docs.length;
                    let parters_names=[];
                    for(doc of docs){
                       parters_names.push(doc.parters_name); 
                    }
                    socket.emit('source_parters_3d',parters_names);
                }
            }
        });
    });
    //处理当楼主选择了一个小组后，完成shop的创建
    socket.on('poster_join',function (result) {
        joinRoom(socket,result.parters_name);
    //    原定为一个小组对应一个楼主，一旦小组与楼主对接匹配成功则创建shop，并使该小组不可得，但为了扩展架构，采用
    //    小组与楼主一对多，不仅合理利用人员配比，也更符合实际情况
    //     Parters.update({parters_name:result.parters_name},{$set:{available:false}},function (err, doc) {
    //         if(err){
    //             console.log(err);
    //         }else {
    //             updateCount();
    //             console.log('----------------mongo数据更新准备-------------------');
    //             console.log('我把小组名为'+result.parters_name+'的小组变为不可用');
    //             console.log('----------------mongo数据更新完成-------------------');
    //         }
    //     });
        Shop.create({poster:nickNames[socket.id],parters_name:result.parters_name},function (err, doc) {
            if(err){
                console.log(err);
            }else {
                console.log('-----------'+nickNames[socket.id]+'与'+result.parters_name+'的杂货店创建成功------------');
            }
        })
    });
//    处理楼主上传文件并H5解析到TextArea经确认无误，点击发送按钮时，将Ta内的消息广播给shop内小组每个成员
    socket.on('poster_send_mail',function (result) {
        console.log('服务器接收到文件内容为：'+result.mail);
        socket.broadcast.to(currentRoom[socket.id]).emit('mail_from_poster',{mail:result.mail});
    });
}
function checkRoom(block_room) {
    if (block_room.length == 0) {
        return false; 
    } else {
        //--------------es6的let方式产生block scope 在for内部保存变量副本，解决异步回调后丢失变量的问题------------------------------
        for(let room_mRs of block_room){
            io.sockets.adapter.clients([room_mRs],function (err, clients) {
                if(err){
                    throw err;
                }
                console.log('找到房间'+room_mRs);
                console.log('该房间长度'+clients.length);
                if(clients.length<2){
                    block_room.push(room_mRs);
                    console.log('当前matchrooms-->所有匹配房间的内数据为：' + matchRooms);
                }
            });
        }
        //------------------------------------------------------------异步转同步---------递归方式-------------------------------------
        // let match_copy = matchRooms.slice(0);
        // function lookMatch() {
        //     if (match_copy.length == 0) {
        //         return;
        //     }
        //     let room_copy = match_copy.shift();
        //     io.sockets.adapter.clients([room_copy], function (err, clients) {
        //         if (err) {
        //             return err;
        //         }
        //         console.log('找到房间' + room_copy);
        //         console.log('该房间长度' + clients.length);
        //         if (clients.length < 2) {
        //             block_room.push(room_copy);
        //             console.log('当前matchrooms-->所有匹配房间的内数据为：' + matchRooms);
        //         }
        //         lookMatch();
        //     })
        // }
        //
        // lookMatch();
        //---------------------------------------------------------------------------------异步转同步------Promise方式-------------------------------
        // function setBlock() {
        //     return new Promise(function (resolve, reject) {
        //         for (var index in matchRooms) {
        //             io.sockets.adapter.clients([matchRooms[index]],function (err, clients) {
        //                 if(err){
        //                     reject(err);
        //                 }
        //                 console.log('找到房间'+matchRooms[index]);
        //                 console.log('该房间长度'+clients.length);
        //                 if(clients.length<2){
        //                     block_room.push(matchRooms[index]);
        //                     console.log('当前的matchrooms内数据为：'+matchRooms);
        //                 }
        //             });
        //         }
        //         resolve();
        //     })
        // }
        //----------------------------------------------------------------------es5中的异步处理，存在变量作用域的问题-------------------------------
        // for (var index in matchRooms) {
        //     io.sockets.adapter.clients([matchRooms[index]],function (err, clients) {
        //         if(err){
        //             throw err;
        //         }
        //         console.log('找到房间'+matchRooms[index]);
        //         console.log('该房间长度'+clients.length);
        //         if(clients.length<2){
        //             block_room.push(matchRooms[index]);
        //         }
        //     });
        // }
        // block_room=Array.from(new Set(block_room));//es6新方法，自动去除数组中的重复元素
        if (block_room.length == 0) {
            return false;
        } else {
            let random_index=Math.floor(Math.random() * block_room.length);
            console.log('得到的可匹配数组的随机index为：'+random_index);
            let random_room = block_room[random_index];
            console.log('在服务端清空在该index的元素之前，在block_room-->所有可用的空匹配房间内数据'+block_room);
            block_room.splice(random_index,1);//删除数组中index位置的元素
            console.log('清空后在block_room-->所有可用的空匹配房间内数据'+block_room);
            return random_room;
        }
    }
}
//用户离开后断开连接、
function handleClientDisconnection(socket) {
    socket.on('disconnect',function () {
        let name=nickNames[socket.id];
        let role='tourist';
        if(currentObj[socket.id]){
            role=currentObj[socket.id].role;
            console.log('---------------用户角色为'+role+'----------');
        }else {
            console.log('---------------不存在这个角色的用户对象----------');
        }
        let new_name='los'+Math.floor(Math.random()*99)+name;
        if(role!='tourist'){
            new_name=name;
        }
        User.update({nickname:name},{$set:{nickname:new_name,status:'down'}},function (err, doc) {
           if(err){
               console.log(err);
           } else {
               count_up--;
               console.log('------------轻轻地'+name+'走了,以后就管他叫'+new_name+'吧-----------------');
               updateCount();
           }
        });
        var nameIndex=namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}

