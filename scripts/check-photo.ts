import {loadEnvConfig} from '@next/env';
import {readFile} from 'node:fs/promises';
import {analyzeObject} from '../lib/ai/gemini';
async function main(){
  loadEnvConfig(process.cwd());
  const key=process.env.GEMINI_API_KEY?.trim();
  if(!key)throw new Error('Gemini key missing');
  try {
    const result=await analyzeObject(`data:image/jpeg;base64,${(await readFile('public/fighters/bottle.jpg')).toString('base64')}`);
    console.log('Bundled sample result:',result);
  }catch(error){const e=error as Error & {status?:number};console.error({name:e.name,status:e.status,message:String(e.message).replaceAll(key,'[REDACTED]').slice(0,2000)});process.exitCode=1;}
}
void main();
