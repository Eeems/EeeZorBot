module.exports = function(){
	this.db = [];
	this.add = function(name,help){
		this.db[name] = help;
		return this;
	};
	this.get = function(name){
		return this.db[name];
	};
	this.each = function(callback){
		for(var i=0;i<this.db.length;i++){
			callback.call(this,i,this.db[i]);
		}
	};
	return this;
};