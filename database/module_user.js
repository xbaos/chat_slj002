/**
 * Created by Administrator on 2017/5/3.
 */
//游客身份需要处理的数据
module.exports = {
    user:{
        nickname:{type:String,required:true},
        password:{type:String,default:"000"},
        sex:{type:String,default:"boy"},
        status:{type:String,default: "down"},
        role:{type:String,default:"tourist"}
    },
    shop:{
        // shopname:{type:String,required:true},
        poster:{type:String,required:true},
        parters_name:{type:String,required:true}
    },
    parters:{
        parters_name:{type:String},
        parter1:{type:String,required:true},
        parter2:{type:String,required:true},
        parter3:{type:String,required:true},
        available:{type:Boolean,default:true}
    },
    content:{
        shopname:{type:String,required:true},
        nickname:{type:String,require:true},
        data:{type:String,require:true},
        time:{type:String,required:true},
        over:{type:Boolean,default:false},
        order:{type:Number}
    }
};