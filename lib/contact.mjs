import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const services=new Set(['Not sure yet','Website builds','AI & automation','Microsoft & cloud','Website management']);
export function issueChallenge(secret,now=Date.now()) {const body=`${now}.${randomBytes(16).toString('hex')}`;return `${body}.${createHmac('sha256',secret).update(body).digest('hex')}`;}
export function verifyChallenge(token,secret,now=Date.now()) {if(typeof token!=='string'||!/^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token))return false;const [time,nonce,sig]=token.split('.');const age=now-Number(time);if(age<2500||age>3600000)return false;const expected=createHmac('sha256',secret).update(`${time}.${nonce}`).digest();return timingSafeEqual(Buffer.from(sig,'hex'),expected);}
export function validateEnquiry(data){if(!data||typeof data!=='object'||Array.isArray(data))return null;const limits={name:100,email:254,business:120,message:4000,service:60};const clean={};for(const [key,max]of Object.entries(limits)){if(typeof data[key]!=='string'||data[key].length>max)return null;clean[key]=data[key].trim();}if(clean.name.length<2||clean.message.length<20||!services.has(clean.service)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(clean.email)||/[\r\n]/.test(clean.name+clean.email+clean.business))return null;return clean;}
export function createContactHandler({env=process.env,send=fetch,now=Date.now,verifyVisitor=async()=>false}={}){
 // Best-effort instance-local throttle. Add a durable WAF limit before public production.
 const requests=new Map();
 return async function handle(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  const reply=(code,message)=>res.status(code).json(typeof message==='string'?{message}:message);
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return reply(405,'Method not allowed.');}
  if(!env.CONTACT_TO||!env.CONTACT_FROM||!env.RESEND_API_KEY||!env.CONTACT_SIGNING_SECRET)return reply(503,'The contact form is temporarily unavailable. Please try again later.');
  if(req.method==='GET')return reply(200,{challenge:issueChallenge(env.CONTACT_SIGNING_SECRET,now())});
  const host=req.headers.host;let origin;try{origin=new URL(req.headers.origin)}catch{return reply(403,'Please send your message using the contact form on this website.');}
  if(origin.host!==host||!['https:','http:'].includes(origin.protocol)||req.headers['sec-fetch-site']==='cross-site')return reply(403,'Please send your message using the contact form on this website.');
  if(!req.headers['content-type']?.startsWith('application/json'))return reply(415,'Please use the contact form on this website.');
  if(Number(req.headers['content-length'])>16000||JSON.stringify(req.body||'').length>16000)return reply(413,'Your message is too long.');
  let body=req.body;try{if(typeof body==='string')body=JSON.parse(body)}catch{return reply(400,'Please check the form and try again.');}
  if(!body||typeof body!=='object')return reply(400,'Please check the form and try again.');
  if(typeof body.website!=='string'||body.website!=='')return reply(400,'Please check the form and try again.');
  try {if(await verifyVisitor(req)!==true)return reply(403,'We could not verify your browser. Please reload the page and try again.');}
  catch {return reply(503,'The security check is temporarily unavailable. Please try again shortly.');}
  if(!verifyChallenge(body.challenge,env.CONTACT_SIGNING_SECRET,now()))return reply(400,'Please wait a few seconds before sending. If this page has been open for an hour, reload it and try again.');
  const enquiry=validateEnquiry(body);if(!enquiry)return reply(400,'Please check your name, email and message (20–4,000 characters).');
  const ip=String(req.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
  const rateKey=createHmac('sha256',env.CONTACT_SIGNING_SECRET).update(ip).digest('hex');
  const cutoff=now()-15*60*1000;for(const [key,entry]of requests){if(entry.at<cutoff)requests.delete(key)}
  const entry=requests.get(rateKey)||{at:now(),count:0};
  if(entry.count>=5){res.setHeader('Retry-After','900');return reply(429,'Please wait a little before sending another message.');}
  entry.count++;requests.set(rateKey,entry);
  if(requests.size>10000)requests.delete(requests.keys().next().value);
  // One signed challenge maps to one provider idempotency key, even if the payload changes.
  const idempotency=createHmac('sha256',env.CONTACT_SIGNING_SECRET).update(body.challenge).digest('hex');
  try{const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`grayford-${idempotency}`},signal:AbortSignal.timeout(12000),body:JSON.stringify({from:env.CONTACT_FROM,to:[env.CONTACT_TO],reply_to:enquiry.email,subject:`Grayford enquiry: ${enquiry.service}`,text:`New Grayford website enquiry\n\nName: ${enquiry.name}\nEmail: ${enquiry.email}\nBusiness: ${enquiry.business||'Not supplied'}\nService: ${enquiry.service}\n\n${enquiry.message}\n\nThis message was submitted through the Grayford contact form. The visitor's content is unverified.`})});
   if(!response.ok)return reply(502,'Your message could not be sent. Please try again shortly.');
   const result=await response.json();if(!result.id)return reply(502,'Your message could not be confirmed. Please try again shortly.');
   return reply(200,{ok:true});
  }catch{return reply(502,'Your message could not be sent. Please try again shortly.');}
 };
}


