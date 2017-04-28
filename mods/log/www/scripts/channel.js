/* eslint-env browser */
window.onload = function(){
    var select = document.getElementById('select');
    document.getElementById('open').onclick = function(){
        location.assign(location.href + (location.href.slice(-1) === '/' ? '' : '/') + select.value);
    };
};
