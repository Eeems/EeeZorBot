var path = require('path'),
    fs = require('fs'),
    chardet = require('chardet'),
    Iconv = require('iconv').Iconv,
    watchHandles = {},
    watchFolderHandles = {},
    subHandles = {},
    Prop = function(props){
        for(var i in props){
            this[i] = props[i];
        }
        return this;
    };
module.exports.Prop = Prop;
module.exports.extend = function(self, ext){
    var i,
        o,
        p,
        fn = function(name){
            if(o[name]){
                p[name] = o[name];
            }
        };
    for(i in ext){
        o = ext[i];
        if(o instanceof module.exports.Prop){
            p = {};
            fn('get');
            fn('set');
            fn('value');
            fn('enumerable');
            fn('configurable');
            fn('writable');
            Object.defineProperty(self, i, p);
        }else{
            self[i] = o;
        }
    }
};
/**
 * @module tools
 * @class tools
 * @static
 */
/**
 * Sanitizes a string for sending to an IRC server
 * @method sanitize
 * @param {string} d
 * @return {string} sanitized string
 */
module.exports.extend(module.exports, {
    sanitize: function(d){
        if(!d){
            return d;
        }
        /* Note:
         * 0x00 (null character) is invalid
         * 0x01 signals a CTCP message, which we shouldn't ever need to do
         * 0x02 is bold in mIRC (and thus other GUI clients)
         * 0x03 precedes a color code in mIRC (and thus other GUI clients)
         * 0x04 thru 0x19 are invalid control codes, except for:
         * 0x16 is "reverse" (swaps fg and bg colors) in mIRC
         */
        return d.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/[^\x02|\x0b|\x16|\x20-\x7e]/g, ''); // eslint-disable-line no-control-regex
    },
    /**
     * Recursive mkdir
     * @method mkdirParent
     * @param {string} dirPath path to create directory structure for
     * @param {string} mode mode to create new directories with
     */
    mkdirParent: function(dirPath, mode){
        dirPath = path.normalize(dirPath);
        var dirs = dirPath.split(path.sep).reverse(),
            dir = '.';
        (function mkdir(dirs, dir){
            if(dirs.length){
                dir = dir + '/' + dirs.pop();
                if(!fs.existsSync(dir)){
                    fs.mkdirSync(dir, mode);
                }
                mkdir(dirs, dir);
            }
        })(dirs, dir);
    },
    /**
     * Makes a string safe for use in RegExp
     * @method regexString
     * @param {string} str
     * @return {string} RegExp safe string
     */
    regexString: function(str){
        return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
    },
    /**
     * Makes a string safe for use in RegExp with * converted to .+
     * @method wildcardString
     * @param {string} str
     * @return {string} RegExp safe string with * turned to .+
     */
    wildcardString: function(str){
        return str.replace(/[-[]\/{}()+?.\\\^\$|]/g, '\\$&').replace(/\*/g, '.+');
    },
    convert: function(buf){
        var encoding = chardet.detect(buf),
            iconv;
        try{
            iconv = new Iconv(encoding, 'UTF-16LE//TRANSLIT//IGNORE');
            buf = iconv.convert(buf);
        }catch(e){}
        return buf;
    },
    mods: function(type){
        var i,
            dir,
            ii,
            config = require('../etc/config.json'),
            mods = [];
        for(i = 0; i < config.mods.length; i++){
            dir = fs.readdirSync('mods/' + config.mods[i] + '/scripts/');
            for(ii in dir){
                if(type + '.js' === dir[ii]){
                    mods.push(config.mods[i]);
                }
            }
        }
        return mods;
    },
    file: {
        watch: function(filepath, callback){
            filepath = path.normalize(filepath);
            if(fs.existsSync(filepath)){
                if(!watchHandles[filepath]){
                    watchHandles[filepath] = fs.watch(filepath);
                }
            }else{
                throw new Error(filepath + ' does not exist');
            }
            watchHandles[filepath].on('change', callback);
        },
        unwatch: function(filepath){
            filepath = fs.normalize(filepath);
            if(watchHandles[filepath]){
                watchHandles[filepath].close();
                delete watchHandles[filepath];
            }
        },
        subscribe: function(filepath){
            filepath = path.normalize(filepath);
            if(!subHandles[filepath]){
                subHandles[filepath] = {
                    data: '',
                    path: filepath,
                    reload: function(){
                        subHandles[filepath].data = fs.readFileSync(filepath, {
                            encoding: 'utf8'
                        });
                    },
                    unwatch: function(){
                        exports.file.unwatch(this.filepath);
                    }
                };
                this.watch(filepath, subHandles[filepath].reload);
                subHandles[filepath].reload();
            }
            return subHandles[filepath];
        }
    },
    folder: {
        watch: function(folder){
            folder = path.normalize(folder);
            if(!watchFolderHandles[folder]){
                watchFolderHandles[folder] = {
                    files: {},
                    path: folder,
                    file: function(filepath){
                        if(filepath.indexOf('..') !== -1 || path.isAbsolute(filepath)){
                            throw new Error('Invalid path: ' + filepath);
                        }
                        filepath = path.normalize(filepath);
                        if(!this.files[filepath]){
                            this.files[filepath] = exports.file.subscribe(path.resolve(this.path, filepath));
                        }
                        return this.files[filepath];
                    },
                    unwatch: function(){
                        exports.folder.unwatch(this.path);
                    }
                };
            }
            return watchFolderHandles[folder];
        },
        unwatch: function(folder){
            folder = path.normalize(folder);
            if(watchFolderHandles[folder]){
                var fh = watchFolderHandles[folder],
                    f;
                while((f = fh.files.pop())){
                    f.unwatch();
                }
                delete watchFolderHandles[folder];
            }
        }
    },
    sizeString: function(bytes){
        var sizes = [
                'B',
                'kB',
                'MB',
                'GB',
                'TB',
                'PB',
                'EB',
                'ZB',
                'YB'
            ],
            i = 0,
            size = bytes;
        while(size > 1000){
            size = size / 1000;
            i++;
        }
        return size.toPrecision(3) + sizes[i];
    }
});
