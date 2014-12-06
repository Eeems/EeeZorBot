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
	serv = http.getServer(settings.host,settings.port).hold(script);
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
						res.write("<html><head></head><body>");
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
					",[args[0]],function(e,r){
						if(e){
							throw e;
						}
						res.write("<html><head></head><body><strong>"+db.querySync("select name from servers where id = ?",[args[0]])[0].name+"</strong><br/>");
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
						res.write("<html><head></head><body><pre>");
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
		var uid = db.querySync("select id from users where name = ?",[this.user.nick]),
			sid = db.querySync("select id from servers where host = ? and port = ?",[server.config.host,server.config.port]),
			cid,
			tid = db.querySync("select id from types where name = 'message'");
		uid = uid[0]===undefined?db.insertSync('users',{name:this.user.nick}):uid[0].id;
		sid = sid[0]===undefined?db.insertSync('servers',{name:server.name,host:server.config.host,port:server.config.port}):sid[0].id;
		tid = tid[0]===undefined?db.insertSync('types',{name:'message'}):tid[0].id;
		cid = db.querySync("select id from channels where name = ? and s_id = ?",[this.channel.name,sid]);
		cid = cid[0]===undefined?db.insertSync('channels',{name:this.channel.name,s_id:sid}):cid[0].id;
		db.insert('messages',{
			text: text,
			c_id: cid,
			u_id: uid,
			s_id: sid,
			t_id: tid
		});
	})
	.on('join',function(){
		console.log(this);
		var uid = db.querySync("select id from users where name = ?",[this.user.nick]),
			sid = db.querySync("select id from servers where host = ? and port = ?",[server.config.host,server.config.port]),
			cid,
			tid = db.querySync("select id from types where name = 'join'");
		uid = uid[0]===undefined?db.insertSync('users',{name:this.user.nick}):uid[0].id;
		sid = sid[0]===undefined?db.insertSync('servers',{name:server.name,host:server.config.host,port:server.config.port}):sid[0].id;
		tid = tid[0]===undefined?db.insertSync('types',{name:'join'}):tid[0].id;
		cid = db.querySync("select id from channels where name = ? and s_id = ?",[this.channel.name,sid]);
		cid = cid[0]===undefined?db.insertSync('channels',{name:this.channel.name,s_id:sid}):cid[0].id;
		db.insert('messages',{
			text: '',
			c_id: cid,
			u_id: uid,
			s_id: sid,
			t_id: tid
		});
	})
	.on('part',function(){
		console.log(this);
		var uid = db.querySync("select id from users where name = ?",[this.user.nick]),
			sid = db.querySync("select id from servers where host = ? and port = ?",[server.config.host,server.config.port]),
			cid,
			tid = db.querySync("select id from types where name = 'part'");
		uid = uid[0]===undefined?db.insertSync('users',{name:this.user.nick}):uid[0].id;
		sid = sid[0]===undefined?db.insertSync('servers',{name:server.name,host:server.config.host,port:server.config.port}):sid[0].id;
		tid = tid[0]===undefined?db.insertSync('types',{name:'part'}):tid[0].id;
		cid = db.querySync("select id from channels where name = ? and s_id = ?",[this.channel.name,sid]);
		cid = cid[0]===undefined?db.insertSync('channels',{name:this.channel.name,s_id:sid}):cid[0].id;
		db.insert('messages',{
			text: '',
			c_id: cid,
			u_id: uid,
			s_id: sid,
			t_id: tid
		});
	});
script.unload = function(){
	serv.release(script);
	serv = undefined;
};