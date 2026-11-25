const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.mp3':'audio/mpeg','.zip':'application/zip'};
// Keep the origin stable so Cifra Dog retains its own browser library.
module.exports=function createCifraDogLauncher({root,openExternal,port=47835}){
 root=path.resolve(root);let server=null,starting=null;
 function start(){if(starting)return starting;starting=new Promise((resolve,reject)=>{
  if(!fs.existsSync(path.join(root,'v2','index.html'))){reject(Error('Os arquivos do Cifra Dog não foram encontrados.'));return;}
  server=http.createServer((req,res)=>{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
   let file;try{let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(pathname.endsWith('/'))pathname+='index.html';file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||pathname.includes('\\')){res.writeHead(403).end();return;}}catch{res.writeHead(400).end();return;}
   fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);});
  });
  server.once('error',error=>reject(Error(error.code==='EADDRINUSE'?'A porta do Cifra Dog está ocupada. Feche outra cópia do Aurora e tente novamente.':error.message)));
  server.listen(port,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port+'/v2/index.html'));
 }).catch(error=>{server?.close();server=null;starting=null;throw error;});return starting;}
 return {async open(){const url=await start();await openExternal(url);return true;},close(){server?.close();server?.closeAllConnections?.();server=null;starting=null;}};
};
