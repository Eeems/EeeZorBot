var path = require('path'),
	fs = require('fs'),
	chardet = require('chardet'),
	Iconv = require('iconv').Iconv,
	watch_handles = {},
	sub_handles = {};
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
exports.sanitize = function(d){
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
	return d.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/[^\x02|\x0b|\x16|\x20-\x7e]/g,"");
};
/**
 * Recursive mkdir
 * @method mkdirParent
 * @param {string} dirPath path to create directory structure for
 * @param {string} mode mode to create new directories with
 */
exports.mkdirParent = function(dirPath,mode){
	dirPath = path.normalize(dirPath);
	var dirs = dirPath.split(path.sep).reverse(),
		dir = '.';
	(function mkdir(dirs,dir){
		if(dirs.length){
			dir = dir+'/'+dirs.pop();
			try{
				fs.mkdirSync(dir,mode);
			}catch(e){}
			mkdir(dirs,dir);
		}
	})(dirs,dir);
};
/**
 * Makes a string safe for use in RegExp
 * @method regexString
 * @param {string} str
 * @return {string} RegExp safe string
 */
exports.regexString = function(str){
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};
/**
 * Makes a string safe for use in RegExp with * converted to .+
 * @method wildcardString
 * @param {string} str
 * @return {string} RegExp safe string with * turned to .+
 */
exports.wildcardString = function(str){
	return str.replace(/[\-\[\]\/\{\}\(\)\+\?\.\\\^\$\|]/g,"\\$&").replace(/\*/g,'.+');
};

exports.convert = function(buf){
	var encoding = chardet.detect(buf);
	try{
		var iconv = new Iconv(encoding,'UTF-16LE//TRANSLIT//IGNORE');
		buf = iconv.convert(buf);
	}catch(e){}
	return buf;
};
exports.mods = function(type){
	var i,
		dir,
		ii,
		config = require('../etc/config.json'),
		mods = [];
	for(i=0;i<config.mods.length;i++){
		dir = fs.readdirSync('mods/'+config.mods[i]+'/scripts/');
		for(ii in dir){
			if(type+'.js'==dir[ii]){
				mods.push(config.mods[i]);
			}
		}
	}
	return mods;
};
exports.file = {
	watch: function(filepath,callback){
		filepath = path.normalize(filepath);
		if(fs.existsSync(filepath)){
			if(!watch_handles[filepath]){
				watch_handles[filepath] = fs.watch(filepath);
			}
		}else{
			throw new Error(filepath+' does not exist');
		}
		watch_handles[filepath].on('change',callback);
	},
	unwatch: function(filepath){
		filepath = fs.normalize(filepath);
		if(watch_handles[filepath]){
			watch_handles[filepath].close();
			delete watch_handles[filepath];
		}
	},
	subscribe: function(filepath){
		filepath = path.normalize(filepath);
		if(!sub_handles[filepath]){
			sub_handles[filepath] = {
				data: '',
				reload: function(){
					sub_handles[filepath].data = fs.readFileSync(filepath,{
						encoding: 'utf8'
					});
				}
			};
			this.watch(filepath,sub_handles[filepath].reload);
			sub_handles[filepath].reload();
		}
		return sub_handles[filepath];
	}
};