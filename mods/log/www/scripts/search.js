RegExp.quote = function(str) {
    return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
};
window.onload = function(){
	NodeList.prototype.forEach = HTMLCollection.prototype.forEach = Array.prototype.forEach;
	document.getElementById('search').onsubmit = function(){
		location.assign(location.origin+'/search/'+encodeURIComponent(this.term.value));
		return false;
	};
	var results = document.getElementById('results');
	window.term.split(' ').forEach(function(term,i){
		results.innerHTML = results.innerHTML.replace(
			new RegExp(">([^<]*)?("+RegExp.quote(term)+")([^>]*)?<",'gi'),
			'>$1<span class="highlight">$2</span>$3<'
		);
	});
};