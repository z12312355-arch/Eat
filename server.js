import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT)||4173;
const allowed=new Set(['index.html','style.css','app.js','core.js','icon.svg','manifest.webmanifest','sw.js']);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=pathname==='/'?'index.html':pathname.slice(1);
    if(!allowed.has(file)){res.writeHead(404);res.end('Not found');return;}
    const data=await readFile(path.join(root,file));
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(400);res.end('Bad request');}
}).listen(port,'0.0.0.0',()=>console.log('Eat wheel: http://localhost:'+port+' (Ctrl+C to stop)'));

