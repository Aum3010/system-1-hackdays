import nextEnv from '@next/env';
import {GoogleGenAI} from '@google/genai';
const {loadEnvConfig}=nextEnv;
loadEnvConfig(process.cwd());
const key=process.env.GEMINI_API_KEY?.trim();
console.log('Gemini key configured:',Boolean(key));
if(!key)process.exit(1);
const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':key}});
const data=await response.json();
console.log('Models API HTTP status:',response.status);
if(response.ok)console.log('Flash models:',data.models?.map(m=>m.name).filter(n=>n.includes('flash')));
else console.log('Provider error category:',data.error?.status||'unknown');
if(response.ok) {
  try {
    const client=new GoogleGenAI({apiKey:key});
    const result=await client.interactions.create({model:process.env.GEMINI_MODEL||'gemini-3.8-flash',input:'Reply with OK.',store:false},{timeout:12000,maxRetries:0});
    console.log('Interactions API status:',result.status);
  } catch(error) {
    console.log('Interactions API error:',{status:error.status,name:error.name,message:String(error.message).replaceAll(key,'[REDACTED]').slice(0,1000)});
    process.exitCode=1;
  }
}
