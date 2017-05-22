/**
 * Created by Administrator on 2017/5/3.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var models = require("./module_user");

for(var m in models){
    mongoose.model(m,new Schema(models[m]));
}

module.exports = {
    getModel: function(type){
        return _getModel(type);
    }
};

var _getModel = function(type){
    return mongoose.model(type);
};