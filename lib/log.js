var config = require('../etc/config.json'),
	tools = require('./tools.js'),
	path = require('path'),
	listdb = require('./listdb.js');
log = {
	alert: function(){
		for(var i in arguments){
			switch(typeof arguments[i]){
				case "string": case "number":
					return log.log("=> "+arguments[i]);
				case "function":
					return log.log("=> "+arguments[i]());
				default:
					return log.error("tried to alert an object or array");
			}
		}
	},
	out: function(){
		for(var i in arguments){
			switch(typeof arguments[i]){
				case "string": case "number":
					return log.log("-> "+arguments[i]);
				case "function":
					return log.log("-> "+arguments[i]());
				default:
					return log.error("tried to alert an object or array");
			}
		}
	},
	"in": function(){
		for(var i in arguments){
			switch(typeof arguments[i]){
				case "string": case "number":
					return log.log("<- "+arguments[i]);
				case "function":
					return log.log("<- "+arguments[i]());
				default:
					return log.error("tried to alert an object or array");
			}
		}
	},
	error: function(){
		for(var i in arguments){
			switch(typeof arguments[i]){
				case "function":
					return log.log("Error: "+arguments[i](),true);
				default:
					return log.log("Error: "+arguments[i],true);
			}
		}
	},
	save: function(log,msg){
		var d = new Date();
		tools.mkdirParent(path.dirname(log));
		if(typeof msg.toString != 'undefiend'){
			msg = msg.toString();
		}
		switch(config.logtype){
			case 'listdb':
					var l = listdb.getDB('logs/'+log);
					l.add(JSON.stringify({
						date: d.getUTCSeconds(),
						msg: msg
					}));
					break;
			case 'txt': default:
				fs.createWriteStream(log+'.log',{
					flags: 'a'
				}).end("["+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+"]	"+msg+"\r\n");
		}
	},
	log: function(msg,save,error){
		var d = new Date();
		error = (typeof error == 'undefined') ? false : true;
		if(!msg instanceof Array || typeof msg == 'string'){
			msg = [msg];
		}
		for(var i in msg){
			if(!isNaN(parseInt(i,10))){
				log.save(d.toDateString(),msg[i]);
				if(error){
					console.error(msg[i]);
				}else{
					console.log(msg[i]);
				}
			}
		}
		return msg;
	},
	trace: function(){
		log.log((new Error()).stack,true);
	}
};
module.exports = log;