const fs = require('fs');
const {execSync}= require('child_process');
let domain = "";
let port = "";
let createService = false;
let applicationPort = "";
let image = "";
let cancel = false;
process.argv.forEach((arg,index) => {
    if(arg === "--domain")
        domain = process.argv[index+1];


    if(arg === "--port")
        port = process.argv[index+1];

    if(arg === "--create-service")
        createService = true;
    if(arg === "--application-port")
        applicationPort = process.argv[index+1];
    if(arg === "--image")
        image = process.argv[index+1];
    if(arg === "--help"){
        return console.log(`
        --domain <DOMAIN> | set the domain
        --port <PORT> | set the port of the dockercontainer
        --application-port | set the port of the application, if other than 80
        --create-service | should a service be created?
        --image | docker image
        `)
        cancel = true;
    }
});
if(cancel) return;
if(createService && !image)
    return console.log("You cant create a service without a image");

if(!port){
    return console.log("You cant create a config without port");
}
if(!domain){
    return console.log("You cant create a config without domain");
}
if(domain){
    fs.writeFileSync("/etc/nginx/conf.d/"+domain+".conf", `
    upstream `+domain+`{
        server 127.0.0.1:`+port+`;
    }
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name `+domain+`;  
        access_log off;
        expires 24h;
        location / {
            proxy_pass         http://127.0.0.1:`+port+`/;
            proxy_http_version 1.1;
            proxy_set_header   Upgrade $http_upgrade;
            proxy_set_header   Connection keep-alive;
            proxy_set_header   Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_redirect                  off;
            proxy_buffers                   32 16k;
            proxy_busy_buffers_size         64k;
            proxy_cache                     off;


            # Headers for client browser NOCACHE + CORS origin filter
            add_header 'Cache-Control' 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
            expires off;

        }

    }`);
}
if(createService){
    let replacedDomain = domain.replace(".", "-");
    execSync("docker pull "+image);
    fs.writeFileSync("/etc/systemd/system/"+replacedDomain+".service", `
    [Unit]
    Description=`+replacedDomain+` Service
    After=docker.service
    Requires=docker.service

    [Service]
    TimeoutStartSec=0
    ExecStartPre=-/usr/bin/docker kill `+replacedDomain+`
    ExecStartPre=-/usr/bin/docker rm `+replacedDomain+`
    ExecStart=/usr/bin/docker run --name `+replacedDomain+` -p `+port+`:`+(applicationPort ? applicationPort : "80")+` -d `+image+`

    [Install]
    WantedBy=multi-user.target

    
    `);
    execSync("certbot --nginx -d "+domain+" --non-interactive --agree-tos -m lukas@lukasgermerott.de");
    execSync("systemctl enable "+replacedDomain+".service");
    execSync("systemctl start "+replacedDomain+".service");
}
execSync("service nginx reload");    


    


