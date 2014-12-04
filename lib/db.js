/*jshint multistr: true */
var mysql = require('mysql'),
	pool = mysql.createPool(
		require('../etc/config.json').mysql
	);
module.exports = {
	exec: function(fn){
		pool.getConnection(function(e,c){
			if(!e){
				fn.exec(c,c);
			}else{
				throw e;
			}
		});
	},
	query: function(){
		pool.query.apply(pool,arguments);
		return this;
	},
	hasIndex: function(table,name,callback){
		this.query("\
			SELECT COUNT(1) IndexIsThere\
			FROM INFORMATION_SCHEMA.STATISTICS\
			WHERE table_schema=DATABASE()\
			AND table_name= ?\
			AND index_name= ?\
		",[table,name],function(e,r,f){
			callback.call(global,r.IndexIsThere>0);
		});
	}
};