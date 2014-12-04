/*jshint multistr: true */
// Make sure database is set up. Create tables if missing
// and create indexes if missing
console.log('Tables');
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
console.log('Indexes');
db.createIndexSync('logs','i_logs_t_id','t_id');
console.log('Server');
var server = http.getServer('localhost',9003);
server.handle(function(req,res){
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