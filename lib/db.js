var mysql = require('mysql'),
	pool = mysql.createPool(
		require('../etc/config.json').mysql
	);
module.exports = function(){
	this.exec = function(fn){
		pool.getConnection(function(e,c){
			if(!e){
				fn.exec(c,c);
			}else{
				throw e;
			}
		});
	};
};