/*jshint multistr: true */
// Make sure database is set up. Create tables if missing
// and create indexes if missing
log.debug('Setting up database');
log.debug('Tables');
db.multiQuerySync([
	"\
		CREATE TABLE IF NOT EXISTS logs (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			date datetime,\
			t_id int,\
			c_id int,\
			s_id int,\
			msg varchar(512)\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS types (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(10) UNIQUE KEY\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS channels (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(10) UNIQUE KEY\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS servers (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(10) UNIQUE KEY\
		)\
	"
]);
log.debug('Indexes');
db.createIndexSync('logs','i_logs_t_id','t_id');
db.createIndexSync('logs','i_logs_c_id','c_id');
db.createIndexSync('logs','i_logs_s_id','s_id');
http.getServer('localhost',9003).handle(function(req,res){
	switch(req.method){
		case 'POST':
			var data = '';
			req.on('data',function(chunk){
				data += chunk;
			});
			req.on('end',function(){
				log.debug('Request Body: '+data);
			});
		break;
	}
});
server.on('join',function(){

});