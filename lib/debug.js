var log = require('./log.js');
module.exports = {
	/**
	 * Description
	 * @method log
	 * @return ThisExpression
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
}