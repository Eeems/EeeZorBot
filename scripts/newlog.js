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
		CREATE TABLE IF NOT EXISTS channels (\
			id int AUTO_INCREMENT PRIMARY KEY,\
			s_id int,\
			name varchar(50) NOT NULL,\
			INDEX i_channels_s_id(s_id),\
			FOREIGN KEY(s_id)\
				REFERENCES servers(id)\
				ON DELETE CASCADE\
				ON UPDATE CASCADE\
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
				ON DELETE CASCADE\
				ON UPDATE CASCADE,\
			FOREIGN KEY (s_id)\
				REFERENCES servers(id)\
				ON DELETE CASCADE\
				ON UPDATE CASCADE,\
			FOREIGN KEY (u_id)\
				REFERENCES users(id)\
				ON DELETE RESTRICT\
				ON UPDATE CASCADE\
		)\
	",
	"\
		CREATE OR REPLACE VIEW messages_v AS\
			SELECT	m.id,\
					s.name AS server,\
					c.name AS channel,\
					u.name AS user,\
					t.name AS type,\
					m.text,\
					m.date\
			FROM messages m\
			JOIN servers s\
				ON s.id = m.s_id\
			JOIN channels c\
				ON c.id = m.c_id\
			JOIN users u\
				ON u.id = m.u_id\
			JOIN types t\
				ON t.id = m.t_id\
			ORDER BY m.date ASC\
	"
]);
// Start http server if it isn't running already
var settings = require('../etc/config.json').logs.server,
	serv = http.getServer(settings.host,settings.port).hold(script),
	id = {
		channel: function(name){
			var sid = id.server(),
				cid = db.querySync("select id from channels where name = ? and s_id = ?",[name,sid])[0];
			return cid===undefined?db.insertSync('channels',{name:name,s_id:sid}):cid.id;
		},
		user: function(nick){
			var uid = db.querySync("select id from users where name = ?",[nick])[0];
			return uid===undefined?db.insertSync('users',{name:nick}):uid.id;
		},
		type: function(name){
			var tid = db.querySync("select id from types where name = ?",[name])[0];
			return tid===undefined?db.insertSync('types',{name:name}):tid.id;
		},
		server: function(){
			var sid = db.querySync("select id from servers where host = ? and port = ?",[server.config.host,server.config.port])[0];
			return sid===undefined?db.insertSync('servers',{name:server.name,host:server.config.host,port:server.config.port}):sid.id;
		}
	};
if(serv._holds.length == 1){
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
			case 'GET':
				var args = req.url.split('/').filter(Boolean);
				if(args.length === 0){
					db.query("\
						SELECT	id,\
								name\
						FROM servers\
					",function(e,r){
						if(e){
							throw e;
						}
						res.write("<html><head></head><body><strong><a href=\"/\">Logs</a></strong><br/>");
						for(var i in r){
							res.write("<a href=\"/"+r[i].id+"\">"+r[i].name+"</a><br/>");
						}
						res.write("</body></html>");
						res.end();
					});
				}else if(args.length == 1){
					db.query("\
						SELECT	id,\
								name\
						FROM channels\
						WHERE s_id = ?\
						AND name like '#%'\
					",[args[0]],function(e,r){
						if(e){
							throw e;
						}
						res.write("<html><head></head><body><strong><a href=\"/\">Logs</a> "+db.querySync("select name from servers where id = ?",[args[0]])[0].name+"</strong><br/>");
						for(var i in r){
							res.write("<a href=\"/"+args[0]+'/'+r[i].id+"\">"+r[i].name+"</a><br/>");
						}
						res.write("</body></html>");
						res.end();
					});
				}else{
					db.query("\
						SELECT	m.id,\
								u.name AS user,\
								t.name AS type,\
								m.text,\
								DATE_FORMAT(m.date,'%k:%i:%s') as time\
						FROM messages m\
						JOIN types t\
							ON t.id = m.t_id\
						JOIN users u\
							ON u.id = m.u_id\
						WHERE m.date >= CURDATE()\
						AND m.c_id = ?\
						ORDER BY m.date ASC\
					",[args[1]],function(e,r){
						if(e){
							throw e;
						}
						res.write("<html><head></head><body><strong><a href=\"/\">Logs</a> <a href=\"/"+args[0]+"\">"+db.querySync("select name from servers where id = ?",[args[0]])[0].name+'</a> '+db.querySync("select name from channels where id = ?",[args[1]])[0].name+"</strong><pre>");
						for(var i in r){
							var m = r[i];
							res.write('['+m.time+'] '+m.type+' &lt;'+m.user+'&gt; '+m.text+"\n");
						}
						res.write("</pre></body></html>");
						res.end();
					});
				}
			break;
		}
	});
}
server.on('servername',function(){
		var sid = db.querySync("select id from servers where host = ? and port = ?",[server.config.host,server.config.port])[0];
		if(sid===undefined){
			db.insert('servers',{name:server.name,host:server.config.host,port:server.config.port});
		}else{
			db.update('servers',sid.id,{name:server.name});
		}
	})
	.on('message',function(text){
		db.insert('messages',{
			text: text,
			c_id: id.channel(this.channel.name),
			u_id: id.user(this.user.nick),
			s_id: id.server(),
			t_id: id.type('message')
		});
	})
	.on('join',function(){
		db.insert('messages',{
			text: '',
			c_id: id.channel(this.channel.name),
			u_id: id.user(this.user.nick),
			s_id: id.server(),
			t_id: id.type('join')
		});
	})
	.on('part',function(){
		db.insert('messages',{
			text: '',
			c_id: id.channel(this.channel.name),
			u_id: id.user(this.user.nick),
			s_id: id.server(),
			t_id: id.type('part')
		});
	});
script.unload = function(){
	serv.release(script);
};