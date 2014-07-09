var path = require('path'),
	fs = require('fs');
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