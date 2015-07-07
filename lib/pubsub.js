var channels = {};

module.exports = {
	pub: function(name,data){
		if(channels[name]){
			for(var i in channels[name]){
				try{
					channels[name][i].call({
						name: name
					},data);
				}catch(e){
					console.error(e);
					console.trace();
				}
			}
		}
		return this;
	},
	sub: function(name,callback){
		if(!channels[name]){
			channels[name] = [];
		}
		channels[name].push(callback);
		return this;
	},
	unsub: function(name,callback){
		if(channels[name] && channels[name].indexOf(callback)){
			channels[name].splice(channels[name].indexOf(callback),1);
		}
		return this;
	}
};