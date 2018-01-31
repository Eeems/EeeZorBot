var config = (function(){
        var c = require('../etc/config.json').logs,
            d = {
                levels: {
                    debug: true,
                    log: true,
                    error: true,
                    warn: true,
                    info: true,
                    trace: true,
                    alert: true,
                    'in': false,
                    out: false
                },
                type: 'text'
            },
            i,
            ii;
        for(i in d){
            if(c[i] === undefined){
                c[i] = d[i];
            }else if(typeof d[i] == 'object'){
                for(ii in d[i]){
                    if(c[i][ii] === undefined){
                        c[i][ii] = d[i][ii];
                    }
                }
            }
        }
        return c;
    })(),
    handle,
    util = require('util'),
    fs = require('fs'),
    Listdb = require('./listdb.js'),
    msgpack = require('msgpack-lite'),
    write = function(msg, type){
        var d = new Date(), i;
        type = type === undefined ? 'log' : type;
        if(!(msg instanceof Array) || typeof msg == 'string'){
            msg = [msg];
        }
        for(i in msg){
            if(!isNaN(parseInt(i, 10))){
                log.save(d.toDateString(), msg[i]);
                console[type](msg[i]);
            }
        }
        return msg;
    },
    /**
     * Logging module to handle outputting logs with the correct format, and saving them to files
     * @module log
     * @main
     * @class log
     * @static
     */
    log = {
        /**
         * Does an alert message ("=> "+message)
         * @method alert
         * @param [message]* Message to display
         */
        alert: function(){
            if(config.levels.alert){
                for(var i in arguments){
                    switch(typeof arguments[i]){
                        case'string': case'number':
                            return write('=> ' + arguments[i], 'info');
                        case'function':
                            return write('=> ' + arguments[i](), 'info');
                        default:
                            return log.error('tried to alert an object or array');
                    }
                }
            }
        },
        /**
         * Outputs an log signifying that the message was sent to an external server ("-> "+message)
         * @method out
         * @param [message]* Message to display
         */
        out: function(){
            if(config.levels.out){
                for(var i in arguments){
                    switch(typeof arguments[i]){
                        case'string': case'number':
                            return write('-> ' + arguments[i], 'log');
                        case'function':
                            return write('-> ' + arguments[i](), 'log');
                        default:
                            return log.error('tried to alert an object or array');
                    }
                }
            }
        },
        /**
         * Outputs an log signifying that the message was recieved from an external server ("<- "+message)
         * @method in
         * @param [message]* Message to display
         */
        'in': function(){
            if(config.levels.in){
                for(var i in arguments){
                    switch(typeof arguments[i]){
                        case'string': case'number':
                            return write('<- ' + arguments[i], 'log');
                        case'function':
                            return write('<- ' + arguments[i](), 'log');
                        default:
                            return log.error('tried to alert an object or array');
                    }
                }
            }
        },
        /**
         * Log an error message ("Error: "+message)
         * @method error
         * @param [message]* Message to display
         */
        error: function(){
            if(config.levels.error){
                for(var i in arguments){
                    switch(typeof arguments[i]){
                        case'function':
                            return write('Error: ' + arguments[i](), 'error');
                        default:
                            return write('Error: ' + arguments[i], 'error');
                    }
                }
            }
        },
        /**
         * Log an error message ("Error: "+message)
         * @method error
         * @param [message]* Message to display
         */
        warn: function(){
            if(config.levels.warn){
                for(var i in arguments){
                    switch(typeof arguments[i]){
                        case'function':
                            return write('Warn: ' + arguments[i](), 'warn');
                        default:
                            return write('Warn: ' + arguments[i], 'warn');
                    }
                }
            }
        },
        /**
         * Log an debug message ("debug: "+message)
         * @method debug
         * @param [message]* Message to display
         */
        debug: function(){
            if(config.levels.debug){
                for(var i in arguments){
                    write('Debug:' + util.inspect(arguments[i]), 'log');
                }
            }
        },
        /**
         * Log an debug message ("Info: "+message)
         * @method info
         * @param [message]* Message to display
         */
        info: function(){
            if(config.levels.info){
                for(var i in arguments){
                    switch(typeof arguments[i]){
                        case'function':
                            return write('Info: ' + arguments[i](), 'info');
                        default:
                            return write('Info: ' + arguments[i], 'info');
                    }
                }
            }
        },
        /**
         * Saves a line to a named log
         * @method save
         * @param {String} name path to the log
         * @param {String} msg line to write to the log file
         * @private
         */
        save: function(name, msg){
            var d = new Date();
            if(msg && typeof msg.toString !== 'undefined'){
                msg = msg.toString();
            }
            switch(config.type){
                case'listdb':
                    if(!handle || handle.name() !== name){
                        handle && handle.end();
                        handle = log.get(name);
                    }
                    handle.add(msgpack.encode({
                        date: +d,
                        msg: msg
                    }).toString('hex'));
                    break;
                // case 'text':
                default:
                    fs.createWriteStream(name + '.log', {
                        flags: 'a'
                    }).end('[' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + ']    ' + msg + '\r\n');
            }
        },
        /**
         * Returns the listdb object for a specific log
         * @method get
         * @param {string} name path to the log file
         * @return {listdb} log
         */
        get: function(name){
            return new Listdb('logs/' + name);
        },
        /**
         * Logs a message and saves the output to a log
         * @method log
         * @param {mixed} [message]* Messages to output
         */
        log: function(){
            if(config.levels.log){
                write.apply(null, arguments);
            }
        },
        /**
         * Outputs a trace log
         * @method trace
         */
        trace: function(e){
            if(config.levels.trace){
                if(!e){
                    e = new Error();
                }
                write(e.stack);
            }
        },
        /**
         * log config
         * @type {object}
         * @property config
         */
        config: config
    };
module.exports = log;
