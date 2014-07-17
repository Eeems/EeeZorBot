var log = require('./log.js');
/**
 * Debug functions
 * @module debug
 * @class debug
 * @static
 * @main
 */
module.exports = {
	/**
	 * Outputs a debug log ("DEBUG: "+JSON.stringify(message))
	 * @method log
	 * @param [message]* messages to output
	 * @chainable
	 */
	log: function(){
		var i,
			s = '',
			args = arguments;
		for(i in args){
			if(args[i] instanceof RegExp){
				args[i] = args[i].toString();
			}
			s += JSON.stringify(args[i])+', ';
		}
		s = s.substr(0,s.length-2);
		log.log('DEBUG: '+s);
		return this;
	}
};