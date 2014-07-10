var fs = require('fs'),
	path = require('path'),
	tools = require('./tools.js');
exports.get = function (dbName) {
	var values,
		todo = [],
		all = false,
		active = false,
		db = {
			name: function(){
				return dbName;
			},
			all: function(){
				return values;
			},
			has: function(value,ic){
				var i,
					v;
				ic = ic||false;
				for(i=0;i<values.length;i++){
					v = values[i];
					if((ic?v.toUpperCase():v) == (ic?value.toUpperCase():value)){
						return true;
					}
				}
				return false;
			},
			add: function (value) {
				values.push(value);
				todo.push(value);
			},
			remove: function (value, ignoreCase){
				dirty = true;
				ignoreCase = ignoreCase || false;
				for(var i=0; i<values.length; i++) {
					if(ignoreCase) {
						if(values[i].toUpperCase() == value.toUpperCase()) {
							values.splice(i,1);
							i--;
						}
					} else {
						if(values[i] == value) {
							values.splice(i,1);
							i--;
						}
					}
				}
				active = true;
				fs.ftruncate(fd,buff.length,function(){
					active = false;
					all = true;
				});
			}
		},
		fd = 'data/'+dbName+'.db';
	tools.mkdirParent(path.dirname(fd));
	try{
		values = fs.readFileSync(fileName,{
			encoding: 'ascii'
		});
	}catch(e){
		values = [];
	}
	if(values && values.length > 0){
		values = values.split('\n');
	}else{
		values = [];
	}
	fs.open(fd,'a',function(e,f){
		fd = f;
		active = false;
		setTimeout(function(){
			if(todo.length > 0 && !active){
				var buff;
				if(all){
					buff = new Buffer(values.join("\n"),'ascii');
				}else{
					buff = new Buffer(todo.shift()+"\n",'ascii');
				}
				active = true;
				fs.write(fd,buff,0,buff.length,undefined,function(){
					active = false;
				});
			}
		},1);
	});
	return db;
};