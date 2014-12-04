/*jshint multistr: true */
var server;
db.multiQuerySync([
	"\
		CREATE TABLE IF NOT EXISTS logs (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			date datetime,\
			t_id int,\
			msg varchar(512)\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS types (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(10) UNIQUE KEY\
		)\
	"
]);
db.createIndexSync('logs','i_logs_t_id','t_id');
process.exit();
