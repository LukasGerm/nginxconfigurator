const fs = require('fs');
const  {exec} = require('child-process');
var mkdirp = require('mkdirp');
let domain = "";
let subdomain = false;
let port = "";


process.argv.forEach((arg,index) => {
    if(arg === "--domain")
        domain = process.argv[index+1];

    if(arg === "--subdomain")
        subdomain = true;

    if(arg === "--port")
        port = process.argv[index+1];
});

if(!port){
    return console.log("You cant create a config without port");
}
if(!domain){
    return console.log("You cant create a config without domain");
}
if(domain){
    let sdomain = ""
    if(subdomain){
        splitDomain = domain.split(".");
        sdomain = splitDomain[splitDomain.length-2]+"."+splitDomain[splitDomain.length-1];
    }
    fs.writeFileSync("/etc/nginx/conf.d/"+domain+".conf", `
    upstream `+domain+`{
        server 127.0.0.1:`+port+`;
    }
    server {
        include cloudflare.`+ (subdomain ? sdomain : domain)+`.ssl;

        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name `+domain+`;  
        access_log off;
        expires 24h;
        location / {
                add_header Access-Control-Allow-Origin *;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
                proxy_set_header X-NginX-Proxy true;
                proxy_pass http://127.0.0.1:`+port+`/;
                proxy_redirect off;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_set_header x-Forwarded-Proto $scheme;
        }

    }`);
}
    
exec("certbot --nginx -d "+domain+" --non-interactive --agree-tos -m lukas@lukasgermerott.de");

    


