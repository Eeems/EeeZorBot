/*jshint multistr: true */
var server;
db.query("\
	CREATE TABLE IF NOT EXISTS logs (\
		id int AUTO_INCREMENT PRIMARY KEY,\
		date datetime,\
		t_id int,\
		msg varchar(512)\
	)\
 ",function(e){
	if(e){
		throw e;
	}
});
db.query("\
	CREATE TABLE IF NOT EXISTS types (\
		id int AUTO_INCREMENT PRIMARY KEY,\
		name varchar(10) UNIQUE KEY\
	)\
 ",function(e){
	if(e){
		throw e;
	}
});
db.hasIndex('logs','test',function(f){
	if(!f){
		db.query("\
			CREATE INDEX i_logs_t_id\
			ON logs (t_id)\
		",function(e){
			if(e){
				throw e;
			}
		});
	}
});