const fs = require("fs");
const env = {};
fs.readFileSync("/home/ubuntu/env/skool-portal.env", "utf8")
  .split(/\r?\n/)
  .filter(l => l && !l.startsWith("#"))
  .forEach(l => { const i = l.indexOf("="); if (i>0) env[l.slice(0,i).trim()] = l.slice(i+1); });

module.exports = {
  apps: [{
    name: "skool-portal",
    script: "./dist/index.mjs",
    cwd: "/home/ubuntu/skool-portal/artifacts/api-server",
    node_args: "--enable-source-maps",
    env,
    max_memory_restart: "500M",
    autorestart: true,
  }]
};
