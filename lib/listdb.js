var fs = require('fs'),
    path = require('path'),
    tools = require('./tools.js');
/**
 * listdb class
 * @module listdb
 * @class Listdb
 * @constructor
 */
module.exports = function(dbName){
    var values,
        todo = [],
        all = false,
        active = false,
        fd = 'data/' + dbName + '.db',
        self = this;
    /**
     * Returnst the name of the listdb
     * @method name
     * @return {string} Name of the listdb
     */
    self.name = function(){
        return dbName;
    };
    /**
     * Get all the values in the listdb
     * @method all
     * @return {array} Values in the listdb
     */
    self.all = function(){
        return values;
    };
    /**
     * Checks to see if the listdb has a certain value in it
     * @method has
     * @param {mixed} value value to check for
     * @param {boolean} [ic=false] Ignore case when searching
     * @return {Boolean} True if the value exists in the listdb
     */
    self.has = function(value, ic){
        var i,
            v;
        ic = ic || false;
        for(i = 0; i < values.length; i++){
            v = values[i];
            if((ic ? v.toUpperCase() : v) === (ic ? value.toUpperCase() : value)){
                return true;
            }
        }
        return false;
    };
    /**
     * Adds an entry to the listdb
     * @method add
     * @param {mixed} value
     */
    self.add = function(value){
        values.push(value);
        todo.push(value);
        self.flush();
    };
    /**
     * Remove a value from the listdb
     * @method remove
     * @param {mixed} value value to remove from the listdb
     * @param {boolean} [ignoreCase=false] Ignore case when searching to remove
     */
    self.remove = function(value, ignoreCase){
        ignoreCase = ignoreCase || false;
        for(var i = 0; i < values.length; i++){
            if(ignoreCase){
                if(values[i].toUpperCase() === value.toUpperCase()){
                    values.splice(i, 1);
                    i--;
                }
            }else{
                if(values[i] === value){
                    values.splice(i, 1);
                    i--;
                }
            }
        }
        console.log('removing');
        active = true;
        var buff = Buffer.from(values.join('\n'), 'ascii'); // eslint-disable-line one-var
        fs.ftruncate(fd, buff.length, function(){
            active = false;
            all = true;
            console.log('done');
        });
    };
    self.truncate = function(){
        values = [];
        fs.truncate(fd);
    };
    self.flush = function(fn){
        if(todo.length > 0){
            if(!active && typeof fd !== 'string'){
                var buff;
                if(all){
                    buff = Buffer.from(values.join('\n'), 'ascii');
                }else{
                    buff = Buffer.from(todo.shift() + '\n', 'ascii');
                }
                active = true;
                fs.write(fd, buff, 0, buff.length, undefined, function(){
                    active = false;
                    fn !== undefined && fn();
                });
            }else if(typeof fd !== 'string'){
                process.nextTick(self.flush);
            }else{
                self.open();
            }
        }else{
            fn !== undefined && fn();
        }
    };
    self.end = function(fn){
        if(typeof fd !== 'string'){
            self.flush(function(){
                fs.close(fd, function(){
                    fd = 'data/' + dbName + '.db';
                    fn !== undefined && fn();
                });
            });
        }
        return self;
    };
    self.open = function(){
        if(typeof fd === 'string'){
            fs.open(fd, 'a', function(e, f){
                fd = f;
                active = false;
                self.flush();
            });
        }
    };
    tools.mkdirParent(path.dirname(fd));
    values = [];
    if(fs.existsSync(fd)){
        try{
            values = fs.readFileSync(fd, {
                encoding: 'ascii'
            });
        }catch(e){
            console.trace(e);
        }
    }
    if(values && values.length > 0){
        values = values.split('\n');
    }else{
        values = [];
    }
    self.open();
    return this;
};
