const fs = require('fs');
const path = require('path');
var mkdirp = require('mkdirp');
let domain = "";
let subdomain = false;
let port = "";

let pubKeyFile = "";
let privKeyFile = "";


process.argv.forEach((arg,index) => {
    if(arg === "--domain")
        domain = process.argv[index+1];

    if(arg === "--subdomain")
        subdomain = true;

    if(arg === "--key")
        privKeyFile = process.argv[index+1];

    if(arg === "--cert")
        pubKeyFile = process.argv[index+1];

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
        location ~* \.(eot|ttf|woff|woff2)$ {
            add_header Access-Control-Allow-Origin *;
        }
        location / {
                
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
    
if(!subdomain){
    fs.writeFileSync("/etc/nginx/cloudflare."+domain+".ssl", `
    ssl_certificate /etc/ssl/nginx/`+domain+`/`+domain+`_rsa_public.pem;
    ssl_certificate_key /etc/ssl/nginx/`+domain+`/`+domain+`_rsa_private.pem;
    ssl_client_certificate /etc/ssl/nginx/origin-pull-ca.pem;
    ssl_verify_client on;
    ssl_protocols TLSv1.3 TLSv1.2 TLSv1.1 TLSv1;
    ssl_ciphers EECDH+AESGCM:EDH+AESGCM:EECDH:EDH:!MD5:!RC4:!LOW:!MEDIUM:!CAMELLIA:!ECDSA:!DES:!DSS:!3DES:!NULL;
    ssl_prefer_server_ciphers on;
    ssl_dhparam /etc/ssl/nginx/dhparam4096.pem;
    ssl_ecdh_curve secp384r1;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    `);
    
    
}
if(pubKeyFile || privKeyFile)
    mkdirp.sync("/etc/ssl/nginx/"+domain);
if(pubKeyFile)
    fs.renameSync(path.join(__dirname, pubKeyFile),"/etc/ssl/nginx/"+domain+"/"+domain+"_rsa_public.pem")
if(privKeyFile)
    fs.renameSync(path.join(__dirname, privKeyFile),"/etc/ssl/nginx/"+domain+"/"+domain+"_rsa_private.pem")
    


