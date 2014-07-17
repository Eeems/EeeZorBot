var config = require('../etc/config.json'),
	path = require('path'),
	fs = require('fs'),
	listdb = require('./listdb.js');
/**
 * Logging module to handle outputting logs with the correct format, and saving them to files
 * @module log
 */
log = {
	/**
	 * Does an alert message ("=> "+message)
	 * @method alert
	 * @param [message]* Message to display
	 */
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
	/**
	 * Outputs an log signifying that the message was sent to an external server ("-> "+message)
	 * @method out
	 * @param [message]* Message to display
	 */
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
	/**
	 * Outputs an log signifying that the message was recieved from an external server ("<- "+message)
	 * @method in
	 * @param [message]* Message to display
	 */
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
	/**
	 * Log an error message ("Error: "+message)
	 * @method error
	 * @param [message]* Message to display
	 */
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
	/**
	 * Description
	 * @method save
	 * @param {} name
	 * @param {} msg
	 * @return 
	 */
	save: function(name,msg){
		var d = new Date();
		if(typeof msg.toString != 'undefiend'){
			msg = msg.toString();
		}
		switch(config.logtype){
			case 'listdb':
				var l = log.get(name);
				l.add(JSON.stringify({
					date: +d,
					msg: msg
				}));
			break;
			//case 'txt':
			default:
				fs.createWriteStream(name+'.log',{
					flags: 'a'
				}).end("["+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds()+"]	"+msg+"\r\n");
		}
	},
	/**
	 * Description
	 * @method get
	 * @param {} name
	 * @return CallExpression
	 */
	get: function(name){
		return listdb.get('logs/'+name);
	},
	/**
	 * Description
	 * @method log
	 * @param {} msg
	 * @param {} save
	 * @param {} error
	 * @return msg
	 */
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
	/**
	 * Description
	 * @method trace
	 * @return 
	 */
	trace: function(){
		log.log((new Error()).stack,true);
	}
};
module.exports = log;