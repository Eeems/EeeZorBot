var path = require('path'),
	fs = require('fs');
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
