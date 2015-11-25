/*jshint multistr: true */
var mysql = require('mysql'),
	deasync = require('deasync'),
	pool = mysql.createPool(
		require('../etc/config.json').mysql
	),
	db = module.exports = {
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
			return db;
		},
		querySync: function(){
			var args = Array.prototype.slice.call(arguments,0),
				sync = true,
				data;
			args.push(function(e,r,f){
				data = e instanceof Error?e:r;
				sync = false;
			});
			db.query.apply(db,args);
			while(sync){
				deasync.sleep(1);
			}
			if(data instanceof Error){
				throw data;
			}
			return data;
		},
		// scripts format: 
		// {
		//		script: 'script',
		//		args: [
		//			'argument',
		//			...
		//		],
		//		'script',
		//		...
		// }
		multiQuery: function(scripts,callback){
			(function(scripts,callback){
				var rs = [],
					run = function(i){
						var a = [];
						if(typeof scripts[i] == 'string'){
							a.push(scripts[i]);
						}else{
							a = [scripts[i].script];
							if(scripts[i].args !== undefied){
								a.push(scripts[i].args);
							}
						}
						a.push(function(e,r,f){
							rs.push(r);
							if(i+1<scripts.length && !e){
								run(i+1);
							}else{
								callback.call(null,e,rs);
							}
						});
						db.query.apply(db,a);
					};
				run(0);
			})(scripts,callback===undefined?function(){}:callback);
		},
		multiQuerySync: function(){
			var args = Array.prototype.slice.call(arguments,0),
				sync = true,
				data;
			args.push(function(e,r){
				data = e instanceof Error?e:r;
				sync = false;
			});
			db.multiQuery.apply(db,args);
			while(sync){
				deasync.sleep(1);
			}
			if(data instanceof Error){
				throw data;
			}
			return data;
		},
		hasIndex: function(table,name,callback){
			callback = callback===undefined?function(){}:callback;
			db.query("\
				SELECT COUNT(1) found\
				FROM INFORMATION_SCHEMA.STATISTICS\
				WHERE table_schema=DATABASE()\
				AND table_name= ?\
				AND index_name= ?\
			",[table,name],function(e,r,f){
				callback.call(null,r[0].found>0);
			});
		},
		hasIndexSync: function(table,name){
			var sync = true,
				data;
			db.hasIndex(table,name,function(v){
				data = v;
				sync = false;
			});
			while(sync){
				deasync.sleep(1);
			}
			return data;
		},
		escapeId: function(name){
			return pool.escapeId(name);
		},
		escape: function(value){
			return pool.escape(value);
		},
		createIndex: function(table,name,column,callback){
			callback = callback===undefined?function(){}:callback;
			db.hasIndex(table,name,function(e){
				if(!e){
					db.query("CREATE INDEX "+db.escapeId(name)+" ON "+db.escapeId(table)+" ("+db.escapeId(column)+")",function(){
						callback.apply(null,arguments);
					});
				}else{
					callback.apply(null,arguments);
				}
			});
		},
		createIndexSync: function(table,name,column){
			var sync = true,
				data;
			db.createIndex(table,name,column,function(e){
				data = e instanceof Error?e:arguments;
				sync = false;
			});
			while(sync){
				deasync.sleep(1);
			}
			if(data instanceof Error){
				throw data;
			}
			return data;
		},
		insert: function(table,columns,callback){
			callback = callback===undefined?function(){}:callback;
			db.query("INSERT INTO "+db.escapeId(table)+" SET ?",[columns],function(e,r,f){
				callback.call(db,e,r===undefined?undefined:r.insertId);
			});
		},
		insertSync: function(table,columns){
			var sync = true,
				data;
			db.insert(table,columns,function(e,r){
				data = e instanceof Error?e:r;
				sync = false;
			});
			while(sync){
				deasync.sleep(1);
			}
			if(data instanceof Error){
				throw data;
			}
			return data;
		},
		update: function(table,id,columns,callback){
			callback = callback===undefined?function(){}:callback;
			db.query("UPDATE "+db.escapeId(table)+" SET ? WHERE id = ?",[columns,id],function(e,r,f){
				callback.call(db,e,r.insertId);
			});
		},
		updateSync: function(table,id,columns){
			var sync = true,
				data;
			db.update(table,id,columns,function(e,r){
				data = e instanceof Error?e:r;
				sync = false;
			});
			while(sync){
				deasync.sleep(1);
			}
			if(data instanceof Error){
				throw data;
			}
			return data;
		}
	};