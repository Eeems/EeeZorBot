var mysql = require('mysql'),
	pool = mysql.createPool(
		require('../etc/config.json').mysql
	);
pool.connect(function(e){
	if(e){
		throw e;
	}
});
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