/**
 * Created by Administrator on 2017/5/3.
 */
var mysql = require('mysql');

var DB_NAME= 'node_test01';

//创建连接池 createPool(Object)
// Object和createConnection参数相同。
var pool = mysql.createPool({
    host : '127.0.0.1',
    user : 'root',
    password :'123456',
    database:'node_test01',
    port : 3306
});
//可以监听connection事件，并设置session值
pool.on('connection',function(connection){
    console.log("pool on");
    connection.query("CREATE TABLE IF NOT EXISTS userinfo (" +
        "userid int(11) NOT NULL AUTO_INCREMENT," +
        "username varchar(64) NOT NULL," +
        "userpwd varchar(64) NOT NULL, " +
        "PRIMARY KEY(userid))",
        function (err) {
            if(err){
                throw err;
            }
            console.log('建表userinfo成功');
        });
    connection.query(String('SET SESSION auto_increment_increment=1'));
});

function Ider(){
    // this.username = user.username;
    // this.userpwd = user.userpwd;
}

Ider.prototype.userSave = function save(user,callback){
    // var user = {
    //     username : this.username,
    //     userpwd : this.userpwd
    // };
    var INSERT_USER= "INSERT INTO USERINFO (USERID,USERNAME,USERPWD) VALUES (0,?,?)";
    pool.getConnection(function(err,connection){
        connection.query(String(INSERT_USER),[user.username,user.userpwd],function(err,result){
            if(err){
                console.log("INSERT_USER Error: " + err.message);
                return;
            }
            connection.release();
            callback(err,result);
        });
    });
};


//根据用户名得到用户数量
Ider.prototype.userNum = function(username, callback) {
    var SELECT_NUM = "SELECT COUNT(1) AS num FROM USERINFO WHERE USERNAME = ?";
    pool.getConnection(function(err,connection){
        console.log("getConnection");
        console.log("getUserNumByName");
        connection.query( String(SELECT_NUM), [username], function (err, result) {
            if (err) {
                console.log("SELECT_NUM Error: " + err.message);
                return;
            }
            connection.release();
            callback(err,result);
        });
    });
};

Ider.prototype.getuserByname = function(name,callback){
    var user = {
        username : this.username,
        userpwd : this.userpwd
    };
    var SELECT_LOGIN ="SELECT * FROM USERINFO WHERE USERNAME = ?";
    pool.getConnection(function(err,connection){
        connection.query(String(SELECT_LOGIN),[user.username],function(err,result){
            if (err) {
                console.log("SELECT_LOGIN Error: " + err.message);
                return;
            }
            connection.release();
            callback(err,result);
        });
    });
};
module.exports = Ider;
