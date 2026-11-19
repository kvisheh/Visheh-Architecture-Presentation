// Supabase Edge Function. Deploy with --no-verify-jwt; login happens here, not in GitHub Pages.
import { createClient } from 'npm:@supabase/supabase-js@2.95.0';
const origin='https://kvisheh.github.io';
const env=(k:string)=>Deno.env.get(k)||'';
function reply(status:number,body:unknown){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey, content-type, authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'}})}
async function hash(s:string){const b=new TextEncoder().encode(s),a=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(a),x=>x.toString(16).padStart(2,'0')).join('')}
async function matches(a:string,b:string){const x=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(a))),y=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(b)));let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return reply(204,{});
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 if(req.headers.get('origin')!==origin)return reply(403,{error:'Origin denied'});
 try{
  const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),service=env('SUPABASE_SERVICE_ROLE_KEY');
  const salt=env('LOGIN_SALT'),teamCode=env('TEAM_CODE'),clientCode=env('CLIENT_CODE');
  if(!salt||!teamCode||!clientCode||!env('TEAM_AUTH_EMAIL')||!env('TEAM_AUTH_PASSWORD')||!env('CLIENT_AUTH_EMAIL')||!env('CLIENT_AUTH_PASSWORD'))return reply(503,{error:'ورود هنوز پیکربندی نشده است.'});
  const admin=createClient(url,service,{auth:{persistSession:false}});
  // Gateway IP plus a global bucket limits online guesses; the salt is never published.
  const ip=req.headers.get('x-real-ip')||req.headers.get('cf-connecting-ip')||'unknown';
  for(const [key,limit] of [[await hash(salt+':'+ip),8],[await hash(salt+':global'),100]] as [string,number][]){
   const {data,error}=await admin.rpc('register_login_attempt',{p_key:key,p_limit:limit});
   if(error||!data)return reply(429,{error:'تلاش‌های ورود زیاد است. ۱۵ دقیقه بعد دوباره امتحان کنید.'});
  }
  const body=await req.json(),password=String(body.password||'');
  if(password.length>256)return reply(401,{error:'کد ورود نامعتبر است.'});
  const team=await matches(password,teamCode),client=await matches(password,clientCode);
  if(!team&&!client)return reply(401,{error:'کد ورود نامعتبر است.'});
  const email=team?env('TEAM_AUTH_EMAIL'):env('CLIENT_AUTH_EMAIL');
  const pass=team?env('TEAM_AUTH_PASSWORD'):env('CLIENT_AUTH_PASSWORD');
  const auth=createClient(url,anon,{auth:{persistSession:false}});
  const {data,error}=await auth.auth.signInWithPassword({email,password:pass});
  if(error||!data.session)return reply(503,{error:'ورود خصوصی در دسترس نیست.'});
  const s=data.session;return reply(200,{access_token:s.access_token,refresh_token:s.refresh_token,expires_in:s.expires_in});
 }catch{return reply(500,{error:'ورود انجام نشد.'})}
});
