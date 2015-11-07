var fs = require('fs'),
	path = require('path'),
	tools = require('./tools.js');
/**
 * listdb class
 * @module listdb
 * @class Listdb
 * @constructor
 */
module.exports = function(dbName){
	var values,
		todo = [],
		all = false,
		active = false,
		fd = 'data/'+dbName+'.db',
		self = this;
	/**
	 * Returnst the name of the listdb
	 * @method name
	 * @return {string} Name of the listdb
	 */
	self.name = function(){
		return dbName;
	};
	/**
	 * Get all the values in the listdb
	 * @method all
	 * @return {array} Values in the listdb
	 */
	self.all = function(){
		return values;
	};
	/**
	 * Checks to see if the listdb has a certain value in it
	 * @method has
	 * @param {mixed} value value to check for
	 * @param {boolean} [ic=false] Ignore case when searching
	 * @return {Boolean} True if the value exists in the listdb
	 */
	self.has = function(value,ic){
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
	};
	/**
	 * Adds an entry to the listdb
	 * @method add
	 * @param {mixed} value
	 */
	self.add = function (value) {
		values.push(value);
		todo.push(value);
		self.flush();
	};
	/**
	 * Remove a value from the listdb
	 * @method remove
	 * @param {mixed} value value to remove from the listdb
	 * @param {boolean} [ignoreCase=false] Ignore case when searching to remove
	 */
	self.remove = function (value, ignoreCase){
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
	};
	self.truncate = function(){
		values = [];
		fs.truncate(fd);
	};
	self.flush = function(){
		if(todo.length > 0){
			if(!active && !isNaN(fd)){
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
			}else{
				setTimeout(self.flush,1);
			}
		}
	};
	self.end = function(fn){
		self.flush();
		fs.close(fd,function(){
			fn();
		});
		return self;
	};
	tools.mkdirParent(path.dirname(fd));
	try{
		values = fs.readFileSync(fd,{
			encoding: 'ascii'
		});
	}catch(e){
		console.trace(e);
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
		self.flush();
	});
	return this;
};