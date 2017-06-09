/**
 * Created by Administrator on 2017/3/24.
 */
//显示可疑文本的方法
function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}
//显示房间列表的方法
// function divEscapedContentElement_roomList(message) {
//     return $('<div></div>').html('<a href="#"><span>'+message+'</span></a>');
//     // return $('<div><a href="#"><span class="room_list_name"></span></a></div>');
// }
//显示系统创建的受信内容
function divSystemContentElement(message) {
    return $('<div></div>').html('<i>'+message+'</i>');
}
//处理原始用户输入的方法，/开头，处理为命令，不加/，处理为消息，发送服务器，并广播给其他用户
function processUserInput(chatApp,type) {
    var message;
    switch (type){
        case 'send_message':
            message=$('#send-massage').val();
            break;
        case 'edit_nickname':
            message='/nick '+$('#nickname-edit').val();
            break;
        case 'edit_newroom':
            message='/join '+$('#newroom-edit').val();
            break;
    }
    // chatApp.set()
    var systemMessage;
    if(message.charAt(0)=='/'){
        systemMessage=chatApp.processCommand(message);
        if(systemMessage){
            $('#messages').append(divSystemContentElement(systemMessage));
        }
    }else {
        console.log('消息内容'+message);
        chatApp.sendMessage($('#room_name').text(),message);
        $('#messages').append(divEscapedContentElement(message));
        console.log('成功发送消息'+message);
        // $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    }
    $('#send-massage').val('');
}
//获得小组成员的UI界面
function getParterUI() {
    $('#match-button').val('匹配回复小组');

}
//获得楼主--消息发布者UI界面
function getPostUI() {
    $('#match-button').val('选择小组回复');
    $('#file_panel').css("display","block");
    $('#send-massage').attr("readonly",true);
}
//H5 file change事件回调process
function posterFileProcess(e) {
    let files=e.target.files;
    let file=files[0];
    let reader=new FileReader();
    reader.onload=posterFileShow;
    reader.readAsText(file,'utf-8');
}
// 文件读完展示在poster_ta里面
function posterFileShow(e) {
    var result=e.target.result;
    $('#poster_ta').text(result);
    $('#poster_ta').css("display","block");
}
//客户端程序初始化逻辑
var socket=io('http://localhost:3000');
$(document).ready(function () {
    let role=$('#user_role').text();
    let user_json=$('#user_all').text();
    let user_all=JSON.parse(user_json);
    socket.emit('client_join',{role:role,client:user_all});
    if(role=='parter'){
        getParterUI();
    }else if(role=='poster'){
        getPostUI();
    }
    let poster_file=document.getElementById('poster_file');
    poster_file.addEventListener('change',posterFileProcess,false);
    var chatApp = new Chat(socket);
    //显示更改昵称的尝试结果
    socket.on('nameResult', function (result) {
        var message;
        if (result.success) {
            message = '你现在被叫做' + result.name + '了哦，思密达';
            // name_n=result.name;
            $('#nick_name').text(result.name);
            $("#modal_nickname").modal("hide");
        } else {
            $("#nickname-error").css("display","block");
            let t = setTimeout(function(){
                $("#nickname-error").css("display","none");
            },2000);
            message = result.message;
        }
        $('#messages').append(divSystemContentElement(message));
    });
    //显示房间变更的结果
    socket.on('joinResult', function (result) {
        $('#room_name').text(result.room);
        $('#room_name').attr("data-hover",result.room);
        $('#messages').append('房间更改了');
        $('#modal_newroom').modal("hide");
    });
    //显示接收到的消息
    socket.on('message', function (message) {
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    });
    //显示可用房间列表
    socket.on('rooms', function (rooms) {
        if(role=='tourist'){
            $('#room-list').empty();
            for (let room in rooms) {
                let room_head = room.substring(0,1);
                console.log('----------------room头'+room_head+'-----------------');
                if (room != ''&&room_head!='G'&&room_head!='m') {
                    // // if(!room_match=='match')
                    // if(role!='tourist'){
                    //     if(room_head=='G'){
                    //         console.log('-------日了狗了---'+room+'---------------------');
                    //     }
                    // }else {
                    // if(room_head!='G'&&room_head!='m'){
                        $('#room-list').append('<div><a href="#"><span>'+room+'</span></a></div>');
                        // }
                    // }
                    // $('#room-list_name').text(room);
                }
            }
        }
        $('#room-list div').click(function () {
            chatApp.processCommand('/join ' + $(this).text());//单击房间名可切换至该房间
            $('#send-massage').focus();
        });
    });
    socket.on('parter_rooms',function (result) {
        let rooms=result.rooms;
        for(let room of rooms){
            console.log('-------get---room---'+room+'---------------------');
            $('#room-list').append('<div><a href="#"><span>'+room+'</span></a></div>');
        }
    });
    socket.on('match_success',function () {
        $('#match-button').val('断开连接');
        $('#messages').empty();
        $('#messages').append('<div>匹配成功！</div>');
    });
    socket.on('break_success',function () {
        $('#match-button').val('重新匹配');
        // $('#messages').empty();
        $('#messages').append('<div>当前连接已断开。。。</div>');
    });
    socket.on('parter_match_success',function () {
        $('#match-button').val('退出小组');
        $('#messages').empty();
        $('#messages').append('<div>回复小组匹配成功！</div>');
    });
    socket.on('parter_break_success',function () {
        $('#match-button').val('重新匹配小组');
        // $('#messages').empty();
        $('#mail').css("display","none");
        $('#messages').append('<div>当前连接已断开。。。</div>');
    });
//    当服务器查过库中可用的parters_room后并发回结果对象，在客户端使用
    socket.on('source_parters_3d',function (result) {
        //result值为库中所有可用小组的名字，小组名字既是对应房间名
        let source_count=result.length;
        if(source_count>9){
            for (let i=0;i<9;i++){
                let random_index=Math.floor(Math.random()*result.length);
                let random_room=result.splice(random_index,1);
                let box_id='box'+(i+1);
                $('#'+box_id).text(random_room);
            }
        }else if(source_count>0){
            for(let i=0;i<source_count;i++){
                let box_id='box'+(i+1);
                $('#'+box_id).text(result[i]);
            }
        }
    });
//    当小组成员接收到对应shop内楼主发来的mail信息时，显示画卷动画，并将mail信息打到ta_message上
    socket.on('mail_from_poster',function (result) {
        $('#ta_message').text(result.mail);
        $('#mail').css("display","block");
    });
//    小组成员接受到来自其他成员的编辑锁，锁住编辑区-----------------------------------------------------------------
    socket.on('edit_lock',function () {
        $('#ta_message').attr("readonly",true);
    });
    socket.on('edit_unlock',function () {
        $('#ta_message').attr("readonly",false);
    });
    socket.on('mail_from_submit',function (result) {
        let mail=result.mail;
        console.log('--------------得到mail---------0001-------'+mail);
        // $('#ta_message').text('');
        $('#ta_message').val(mail);
    });
    socket.on('reply_success',function (result) {
        if(role=='parter'){
            $('#mail').css('display','none');
            $('#messages').append('<div>回复楼主成功！！！</div>');
        }else if(role=='poster'){
            let mail=result.mail;
            console.log('--------------楼主得到小组回复的mail---------0001-------'+mail);
            $('#poster_ta').val(mail);
        }
    });
//    --------------------------------------------------------------------------------------------------------
//    监听人数更新事件
    socket.on('set_count',function (result) {
        let boy_count=result.boy_count;
        let girl_count=result.girl_count;
        $('#boy_count').text(boy_count);
        $('#girl_count').text(girl_count);
    });
//    定期请求可用的房间列表
    setInterval(function () {
        socket.emit('rooms');
    }, 1000);
    //对回复小组成员身份下，画布中消息的TextArea的淡入淡出效果按钮进行监听----------------------画卷中的操作监听-------
    //            fadeIn事件
    $("#btn_fadein").click(function () {
        // tip.html("");
//                在3000毫秒中淡入图片，并执行一个回调函数
        $("#ta_message").fadeIn(3000,function () {
            // tip.html("淡入成功");
        })
    });
    //            fadeOut事件
    $("#btn_fadeout").click(function () {
        // tip.html("");
//                在3000毫秒中淡出图片，并执行一个回调函数
        $("#ta_message").fadeOut(3000,function () {
            // tip.html("淡出成功");
        })
    });
    //小组成员编辑事件
    $('#btn_parter_edit').click(function () {
        let text=$(this).val();
        if(text=='开始编辑'){
            $(this).val('退出编辑');
            socket.emit('start_edit');
        }else if(text=='退出编辑'){
            $(this).val('开始编辑');
            socket.emit('exit_edit');
        }
    });
    //抢占锁并编辑完，提交的监听
    $('#btn_parter_submit').click(function () {
        let mail=$('#ta_message').val();
        console.log('----------第一步获得mail'+mail+'-------------------------');
        socket.emit('submit_mail',{mail:mail});
    });
    //小组成员回复楼主处理
    $('#btn_parter_reply').click(function () {
        $(this).val('回复中');
        let mail=$('#ta_message').val();
        console.log('----------回复时得到mail'+mail+'-------------------------');
        socket.emit('reply_mail',{mail:mail});
    });
    //----------------------------------------------------------------------------画卷操作end------------------------
    // $('#send-massage').focus();
    $('#send-button').click(function () {
        if(role!='poster'){
            processUserInput(chatApp,'send_message');
        }else {
            let mail=$('#poster_ta').val();
            socket.emit('poster_send_mail',{mail:mail});
        }
        // return false;
    });
//    对初始的卡牌进行选择类别，进入系统
    $('#begin_choose li').click(function () {
        let card_value=$(this).attr('card');
        let sex='boy';
        if(card_value=='boy'||card_value=='girl'){
            sex=card_value;
        }
        // chatApp.setRoom(card_value);
        document.getElementById('card_in').style.display='none';
        console.log('choose----------'+card_value);
        socket.emit('card_join',{
            // chat_client:chatApp,
            room:card_value,
            sex:sex
        });
    });
//    对匹配按钮进行监听
    $('#match-button').click(function () {
        let match_value=$(this).val();
        if(role=='tourist'){
            if(match_value=='开始匹配'||match_value=='重新匹配'){
                $(this).val('匹配中');
                socket.emit('match');
            }else {
                $(this).val('开始匹配');
                socket.emit('break');
            }
        }else if(role=='parter'){
            if(match_value=='匹配回复小组'||match_value=='重新匹配小组'){
                $(this).val('退出小组');
                socket.emit('parter_match');
            }else {
                $(this).val('重新匹配小组');
                socket.emit('parter_break');
            }
        }else if(role=='poster'){
            if(match_value=='选择小组回复'){
                // $(this).val('退出小组');
                socket.emit('poster_match');
                $('#show_box_3d').css("display","block");
            }
        }
    });
    //对3d盒子房间的单击选择事件进行监听
    $('.box').click(function () {
        let box_value=$(this).text();
        if(box_value){
            socket.emit('poster_join',{parters_name:box_value});
            $('#show_box_3d').css("display","none");
        }
    });
    //点击修改信息后显示修改选项列表
    $('#li_edit_nick').click(function () {
        $('#modal_nickname').modal("show");
    });
    $('#li_edit_new').click(function () {
        $('#modal_newroom').modal("show");
    });
    //在修改完点击确认修改时提交到服务器进行处理
    $('#btn_save_info').click(function () {
        processUserInput(chatApp,'edit_nickname');
        // processUserInput(chatApp,'edit_sex');
        let new_name = $("#nickname-edit").val();
        let sex= $("input[name='sex']:checked").val();
        let old_name=$("#nick_name").text();
        $('#user_sex').text(sex);
        socket.emit('save_info', 
            {   old_name:old_name,
                new_name:new_name,
                sex:sex
            });
        return false;
    });
    $('#btn_save_new').click(function () {
        processUserInput(chatApp,'edit_newroom');
        return false;
    });
});