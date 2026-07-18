window.onerror=function(msg,url,line,col,err){
  document.body.innerHTML='<pre style="color:#fff;padding:20px;white-space:pre-wrap;font-size:12px;background:#1A2540">ERROR: '+msg+'\nLinea: '+line+':'+col+'\n'+(err&&err.stack||'')+'</pre>';
};
window.addEventListener('unhandledrejection',function(e){
  document.body.innerHTML='<pre style="color:#fff;padding:20px;white-space:pre-wrap;font-size:12px;background:#1A2540">PROMISE ERROR: '+(e.reason&&(e.reason.message||e.reason.toString())||e.reason)+'</pre>';
});
