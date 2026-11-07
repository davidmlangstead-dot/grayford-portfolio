import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('service selection is carried through and accepted enquiries cannot be resubmitted',async()=>{
 const source=await readFile(new URL('../public/site.js',import.meta.url),'utf8');
 const service={options:[{value:'Not sure yet'},{value:'Website builds'}],value:'Not sure yet'};
 const submit={};const status={classList:{add(){},remove(){}}};let handler,reset=0,calls=0;
 const form={querySelector:s=>s==='[name=service]'?service:submit,addEventListener:(name,fn)=>handler=fn,reportValidity:()=>true,reset:()=>reset++};
 const context={document:{querySelector:s=>s==='#contact-form'?form:s==='#form-status'?status:null,addEventListener(){}},location:{search:'?service=Website%20builds'},URLSearchParams,AbortSignal,FormData:class{*[Symbol.iterator](){yield ['service',service.value]}},fetch:async()=>{calls++;if(calls>2)throw Error('No further request should be made after success');return {ok:true,json:async()=>calls===1?{challenge:'test'}:{ok:true}}}};
 vm.runInNewContext(source,context);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(service.value,'Website builds');assert.equal(submit.disabled,false);
 await handler({preventDefault(){}});assert.equal(reset,1);assert.equal(submit.disabled,true);assert.match(status.textContent,/message has been sent/);
 await handler({preventDefault(){}});assert.equal(calls,2);assert.equal(reset,1);
});

