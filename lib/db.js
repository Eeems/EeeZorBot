/* global log */
/* jshint multistr: true */
/* eslint no-multi-str: 0 */
var mysql = require('mysql'),
    deasync = require('deasync'),
    pool = mysql.createPool(
        (function(){
            var c = require('../etc/config.json').mysql;
            c.multipleStatements = true;
            c.acquireTimeout = 1000;
            c.connectTimeout = 10 * 1000;
            return c;
        })()
    ),
    db = module.exports = {
        exec: function(fn){
            pool.getConnection(function(e, c){
                if(!e){
                    fn.exec(c, c);
                }else{
                    throw e;
                }
            });
        },
        query: function(){
            var args = Array.prototype.slice.call(arguments),
                i, fn;
            for(i = args.length - 1; i > 0; i--){
                if(typeof args[i] == 'function'){
                    fn = args[i];
                    args[i] = function(e){
                        if(e && ['ER_LOCK_WAIT_TIMEOUT', 'ER_LOCK_DEADLOCK'].indexOf(e.code) !== -1){
                            pool.query.apply(pool, args);
                            if(e.code === 'ER_LOCK_DEADLOCK'){
                                log.error('Database deadlock detected.');
                            }
                        }else{
                            fn.apply(this, arguments);
                        }
                    };
                }
            }
            pool.query.apply(pool, args);
            return db;
        },
        querySync: function(){
            var args = Array.prototype.slice.call(arguments, 0),
                exec = deasync(db.query);
            return exec.apply(exec, args);
        },
        // scripts format:
        // {
        //      script: 'script',
        //      args: [
        //          'argument',
        //          ...
        //      ],
        //      'script',
        //      ...
        // }
        multiQuery: function(scripts, callback){
            (function(scripts, callback){
                var rs = [],
                    run = function(i){
                        var a = [];
                        if(typeof scripts[i] == 'string'){
                            a.push(scripts[i]);
                        }else{
                            a = [scripts[i].script];
                            if(scripts[i].args !== undefined){
                                a.push(scripts[i].args);
                            }
                        }
                        a.push(function(e, r, f){
                            rs.push(r);
                            if(i + 1 < scripts.length && !e){
                                run(i + 1);
                            }else{
                                callback.call(null, e, rs); // eslint-disable-line no-useless-call
                            }
                        });
                        db.query.apply(db, a);
                    };
                run(0);
            }(scripts, callback === undefined ? function(){} : callback));
        },
        multiQuerySync: function(){
            var args = Array.prototype.slice.call(arguments, 0),
                exec = deasync(db.multiQuery);
            return exec.apply(exec, args);
        },
        hasIndex: function(table, name, callback){
            callback = callback === undefined ? function(){} : callback;
            db.query('\
                SELECT COUNT(1) found\
                FROM INFORMATION_SCHEMA.STATISTICS\
                WHERE table_schema=DATABASE()\
                AND table_name= ?\
                AND index_name= ?\
            ', [table, name], function(e, r, f){
                callback.call(null, r[0].found > 0); // eslint-disable-line no-useless-call
            });
        },
        hasIndexSync: function(table, name){
            var exec = deasync(db.hasIndex);
            return exec(table, name);
        },
        escapeId: function(name){
            return pool.escapeId(name);
        },
        escape: function(value){
            return pool.escape(value);
        },
        createIndex: function(table, name, column, callback){
            callback = callback === undefined ? function(){} : callback;
            db.hasIndex(table, name, function(e){
                if(!e){
                    db.query('CREATE INDEX ' + db.escapeId(name) + ' ON ' + db.escapeId(table) + ' (' + db.escapeId(column) + ')', function(){
                        callback.apply(null, arguments);
                    });
                }else{
                    callback.apply(null, arguments);
                }
            });
        },
        createIndexSync: function(table, name, column){
            var exec = deasync(db.createIndex);
            return exec(table, name, column);
        },
        insert: function(table, columns, callback){
            callback = callback === undefined ? function(){} : callback;
            db.query('INSERT INTO ' + db.escapeId(table) + ' SET ?', [columns], function(e, r, f){
                callback.call(db, e, r === undefined ? undefined : r.insertId);
            });
        },
        insertSync: function(table, columns){
            var exec = deasync(db.insert);
            return exec(table, columns);
        },
        update: function(table, id, columns, callback){
            callback = callback === undefined ? function(){} : callback;
            db.query('UPDATE ' + db.escapeId(table) + ' SET ? WHERE id = ?', [columns, id], function(e, r, f){
                callback.call(db, e, r.insertId);
            });
        },
        updateSync: function(table, id, columns){
            var exec = deasync(db.update);
            return exec(table, id, columns);
        }
    };
