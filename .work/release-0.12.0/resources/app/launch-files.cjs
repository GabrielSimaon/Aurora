'use strict';
const path=require('node:path');
function pathsFromArgs(args){const seen=new Set(),files=[];for(let value of Array.isArray(args)?args:[]){if(typeof value!=='string'||value.startsWith('--'))continue;if(value.startsWith('"')&&value.endsWith('"'))value=value.slice(1,-1);if(!/\.(mid|midi|kar|rmi)$/i.test(value))continue;const file=path.resolve(value),key=file.toLowerCase();if(!seen.has(key)){seen.add(key);files.push(file);}}return files;}
module.exports={pathsFromArgs};
