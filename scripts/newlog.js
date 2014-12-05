/*jshint multistr: true */
// Make sure database is set up. Create tables if missing
// and create indexes if missing
server.debug(' |  |  |- Setting up database');
db.multiQuerySync([
	"\
		CREATE TABLE IF NOT EXISTS types (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(10) UNIQUE KEY NOT NULL\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS channels (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(50) UNIQUE KEY NOT NULL\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS users (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(9) UNIQUE KEY NOT NULL\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS servers (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			name varchar(63) UNIQUE KEY NOT NULL,\
			host varchar(400),\
			port int\
		)\
	",
	"\
		CREATE TABLE IF NOT EXISTS messages (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			date datetime DEFAULT CURRENT_TIMESTAMP,\
			t_id int,\
			c_id int,\
			s_id int,\
			u_id int,\
			text varchar(512),\
			INDEX i_logs_t_id(t_id),\
			INDEX i_logs_c_id(c_id),\
			INDEX i_logs_s_id(s_id),\
			INDEX i_logs_u_id(u_id),\
			FOREIGN KEY (t_id)\
				REFERENCES types(id)\
				ON DELETE RESTRICT\
				ON UPDATE CASCADE,\
			FOREIGN KEY (c_id)\
				REFERENCES channels(id)\
				ON DELETE RESTRICT\
				ON UPDATE CASCADE,\
			FOREIGN KEY (s_id)\
				REFERENCES servers(id)\
				ON DELETE RESTRICT\
				ON UPDATE CASCADE,\
			FOREIGN KEY (u_id)\
				REFERENCES users(id)\
				ON DELETE RESTRICT\
				ON UPDATE CASCADE\
		)\
	"
]);
// Start http server if it isn't running already
var settings = require('../etc/config.json').logs.server,
	serv = http.getServer(settings.host,settings.port).hold(script.suid);
if(serv._holds == 1){
	serv.handle(function(req,res){
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
}
server.on('message',function(text){
	var uid = db.querySync("select id from users where name = ?",[this.user.nick]),
		cid = db.querySync("select id from channels where name = ?",[this.channel.name]),
		sid = db.querySync("select id from servers where name = ?",[server.name]),
		tid = db.querySync("select id from types where name = 'message'");
	uid = uid[0]===undefined?db.insertSync('users',{name:this.user.nick}):uid[0].id;
	cid = cid[0]===undefined?db.insertSync('channels',{name:this.channel.name}):cid[0].id;
	sid = sid[0]===undefined?db.insertSync('servers',{name:server.name}):sid[0].id;
	tid = tid[0]===undefined?db.insertSync('types',{name:'message'}):tid[0].id;
	db.insert('messages',{
		text: text,
		c_id: cid,
		u_id: uid,
		s_id: sid,
		t_id: tid
	});
});
script.unload = function(){
	serv.release(script.suid);
	serv = undefined;
};