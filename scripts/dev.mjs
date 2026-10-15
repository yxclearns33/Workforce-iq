import { spawn } from 'node:child_process';
import { createAIServer } from '../server/ai.mjs';
try { process.loadEnvFile('.env.local'); } catch(error) {if(error.code!=='ENOENT') throw error;}
const server=createAIServer();
server.listen(3001,'127.0.0.1');
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{stdio:'inherit'});
function stop(){child.kill();server.close();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
child.on('exit',code=>{server.close();process.exitCode=code||0;});
