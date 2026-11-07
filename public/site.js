const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('#navigation');
toggle?.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'Close':'Menu';nav.classList.toggle('open',open)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle?.getAttribute('aria-expanded')==='true'){toggle.click();toggle.focus()}});
const form=document.querySelector('#contact-form');
if(form){
 const service=form.querySelector('[name=service]');
 const requestedService=new URLSearchParams(location.search).get('service');
 if(service&&[...service.options].some(option=>option.value===requestedService))service.value=requestedService;
 let challenge;
 let sent=false;
 const status=document.querySelector('#form-status');
 const submit=form.querySelector('button[type=submit]');
 submit.disabled=true;
 const prepare=async()=>{const r=await fetch('/api/contact',{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('The contact form is temporarily unavailable. Please reload the page to try again.');const data=await r.json();if(typeof data.challenge!=='string')throw new Error('Please reload the page to try again.');challenge=data.challenge;submit.disabled=false;};
 const ready=prepare().catch(()=>{status.textContent='The contact form is temporarily unavailable. Please reload the page to try again.';status.classList.add('error');submit.disabled=true;});
 form.addEventListener('submit',async e=>{e.preventDefault();if(sent||!form.reportValidity())return;await ready;if(!challenge)return;submit.disabled=true;submit.textContent='Sending…';status.textContent='';status.classList.remove('error');
 try{const data=Object.fromEntries(new FormData(form));data.challenge=challenge;const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});if(response.status===429)throw new Error('Too many messages have been attempted from your connection. Please wait 10 minutes and try again.');const result=await response.json();if(!response.ok||result.ok!==true)throw new Error(result.message||'Your message could not be sent. Please try again.');sent=true;form.reset();status.textContent='Thank you. Your message has been sent. You’ll receive a reply at the email address you provided.';}
 catch(error){status.textContent=error.message||'Your message could not be sent. Please check your connection and try again.';status.classList.add('error');}
 finally{submit.disabled=sent;submit.innerHTML=sent?'Message sent':'Send message <span aria-hidden="true">↗</span>';}
 });
}



