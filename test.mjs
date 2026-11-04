import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encode,decode,OpenAIDecisionsPlugin,BASE} from './adapter.mjs';
const body={model:'gpt-6-luna',state:{text:'hello'},questions:{p:{type:'noul',instructions:'True?'},c:{type:'choice',instructions:'Which?',criteria:{a:null,b:'Other'}},s:{type:'score',instructions:'How?',criteria:['low','high']}}};
const result={answers:[{name:'p',type:'predicate',probability:0.7},{name:'c',type:'choice',choice:'a',confidence:0.8,probabilities:[{value:'a',probability:0.9},{value:'b',probability:0.1}]},{name:'s',type:'score',score:0.4,confidence:0.6,probabilities:[{value:0,probability:0.6},{value:1,probability:0.4}]}]};
test('three protocol mappings preserve names, values and rubric order',()=>{
 const req=encode(body); assert.equal(req.input[0].content[0].type,'input_json'); assert.equal(req.questions[0].type,'predicate'); assert.deepEqual(req.questions[2].levels.map(x=>x.label),['0','1']);
 const out=decode(result,req); assert.equal(out.answers.p.noul,0.7); assert.equal(out.answers.c.probabilities.a,0.9); assert.equal(out.answers.s.score,0.4);
});
test('reject unsupported score and question fields',()=>{
 for(const q of [{type:'score',instructions:'x'},{type:'noul',instructions:'x',extra:true},{type:'unknown',instructions:'x'}]) assert.throws(()=>encode({...body,questions:{q}}));
});
test('refusal, missing, duplicate, invalid probability and choice fail closed',()=>{
 for(const mutate of [r=>r.answers.pop(),r=>r.answers[0].type='refusal',r=>r.answers[0].probability=2,r=>r.answers[1].choice='unknown',r=>r.answers[1].name='p',r=>r.answers[1].probabilities[0].probability=0.2]) { const r=structuredClone(result); mutate(r); assert.throws(()=>decode(r,encode(body))); }
});
const request=()=>({method:'POST',body:JSON.stringify(body)});
test('Magpie auth and endpoint isolation, no caller headers forwarded',async()=>{
 let calls=0; const hooks=await OpenAIDecisionsPlugin({}, {fetchImpl:async(url,init)=>{calls++; assert.equal(url,BASE+'/decisions');assert.equal(init.headers.authorization,'Bearer fake-test');assert.equal(init.redirect,'error'); return Response.json(result);}});
 const loader=await hooks.auth.loader(async()=>({type:'api',key:'fake-test'}));
 assert.equal((await loader.fetch(BASE+'/systemone',request())).status,200);
 await assert.rejects(loader.fetch('https://example.com/systemone',request()));assert.equal(calls,1);
 const controller=new AbortController();controller.abort();await assert.rejects(loader.fetch(BASE+'/systemone',{...request(),signal:controller.signal}));assert.equal(calls,1);
});
test('HTTP errors are sanitized',async()=>{
 const hooks=await OpenAIDecisionsPlugin({}, {fetchImpl:async()=>new Response('sensitive upstream detail',{status:429})});
 const loader=await hooks.auth.loader(async()=>({type:'api',key:'fake-test'})); const res=await loader.fetch(BASE+'/systemone',request());assert.equal(res.status,429);assert.doesNotMatch(await res.text(),/sensitive/);
});
test('timeout propagates to fetch and returns sanitized error',async()=>{
 const hooks=await OpenAIDecisionsPlugin({}, {timeoutMs:10,fetchImpl:async(_u,{signal})=>new Promise((resolve,reject)=>{const timer=setTimeout(resolve,1000);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(signal.reason);});})});
 const loader=await hooks.auth.loader(async()=>({type:'api',key:'fake-test'}));await assert.rejects(loader.fetch(BASE+'/systemone',request()),/timed out/);
});
test('host entry exports only factory; config, model registration and key UI match host contract',async()=>{
 const mod=await import('./index.mjs');assert.deepEqual(Object.keys(mod),['OpenAIDecisionsPlugin']);
 const hooks=await mod.OpenAIDecisionsPlugin({});const cfg={};await hooks.config(cfg);
 assert.equal(cfg.provider['openai-decisions'].decide,true);assert.equal(hooks.auth.provider,hooks.provider.id);
 assert.equal(hooks.auth.methods[0].type,'api');assert.equal(hooks.auth.methods[0].authorize,undefined);
 assert.equal((await hooks.provider.models())['gpt-6-luna'].decides,true);
});
test('reordered answers and usage preserve measured values, never copy unknown fields',()=>{
 const usage={input_tokens:42,output_tokens:0,total_tokens:42,input_tokens_details:{cached_tokens:20,cache_write_tokens:0},output_tokens_details:{reasoning_tokens:0}};
 const r={...result,answers:[...result.answers].reverse(),usage:{...usage,secret:'do not echo'}};
 const out=decode(r,encode(body));assert.deepEqual(out.usage,usage);assert.equal(out.answers.p.noul,0.7);
 assert.equal(decode(result,encode(body)).usage,undefined);
 assert.throws(()=>decode({...r,usage:{input_tokens:-1}},encode(body)));
});
test('score distributions and response integrity reject invalid or inconsistent data',()=>{
 for(const mutate of [r=>r.answers.push(r.answers[0]),r=>r.answers[0]=null,r=>r.answers[2].score=0.9,r=>r.answers[2].probabilities.pop(),r=>r.answers[2].probabilities[0].value=1,r=>r.model='wrong']) {
 const r=structuredClone(result);mutate(r);assert.throws(()=>decode(r,encode(body)));
 }
});
test('request limits and unsupported top-level options fail before transport',()=>{
 for(const b of [{...body,stream:true},{...body,questions:{}},{...body,model:'unknown'},{...body,state:null},{...body,questions:Object.fromEntries(Array.from({length:401},(_,i)=>[String(i),body.questions.p]))}]) assert.throws(()=>encode(b));
});
test('auth failure and network exceptions cannot leak key or upstream error text',async()=>{
 const secret='fake-sensitive-marker';
 for(const auth of [async()=>{throw new Error(secret)},async()=>({type:'api',key:secret})]) {
 const hooks=await OpenAIDecisionsPlugin({}, {fetchImpl:async()=>{throw new Error(secret)}});const loader=await hooks.auth.loader(auth);
 await assert.rejects(loader.fetch(BASE+'/systemone',request()),e=>!String(e).includes(secret));
 }
});
test('caller cancellation during transport aborts the upstream signal',async()=>{
 const ctl=new AbortController();let started;
 const ready=new Promise(resolve=>{started=resolve});
 const hooks=await OpenAIDecisionsPlugin({}, {fetchImpl:async(_u,{signal})=>new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});started();})});
 const loader=await hooks.auth.loader(async()=>({type:'api',key:'fake-test'}));
 const pending=loader.fetch(BASE+'/systemone',{...request(),signal:ctl.signal});await ready;ctl.abort();await assert.rejects(pending,/cancelled/);
});
test('unauthenticated requests, malformed JSON and redirect responses fail safely',async()=>{
 let calls=0;const hooks=await OpenAIDecisionsPlugin({}, {fetchImpl:async()=>{calls++;return new Response('',{status:302});}});
 const anon=await hooks.auth.loader(async()=>undefined);await assert.rejects(anon.fetch(BASE+'/systemone',request()));assert.equal(calls,0);
 const loader=await hooks.auth.loader(async()=>({type:'api',key:'fake-test'}));
 await assert.rejects(loader.fetch(BASE+'/systemone',{method:'POST',body:'{'}));assert.equal(calls,0);
 assert.equal((await loader.fetch(BASE+'/systemone',request())).status,502);
});
test('Magpie preliminary level classification and automatic effort use four-level rubrics',()=>{
 const rubric=['little work','some work','much work','the most work'];
 const request=encode({model:'gpt-6-luna',state:{kinds:['simple','complex']},questions:{levels:{type:'noul',instructions:'Are these levels?'},work0:{type:'score',instructions:'Work at simple?',criteria:rubric},work1:{type:'score',instructions:'Work at complex?',criteria:rubric}}});
 assert.equal(request.questions[0].type,'predicate');assert.equal(request.questions[1].levels.length,4);
 const answers=[{name:'levels',type:'predicate',probability:0.95},...['work0','work1'].map((name,i)=>({name,type:'score',score:i*3,confidence:0.8,probabilities:rubric.map((_,j)=>({value:j,probability:j===i*3?1:0}))}))];
 const out=decode({answers},request);assert.equal(out.answers.work0.score,0);assert.equal(out.answers.work1.score,3);
 const effort=encode({model:'gpt-6-luna',state:'Build an app',questions:{effort:{type:'score',instructions:'Effort?',criteria:rubric}}});assert.equal(effort.questions[0].levels[3].label,'3');
});
test('concurrent account requests isolate keys, results and cancellation',async()=>{
 const seen=[];let firstStarted;const ready=new Promise(resolve=>firstStarted=resolve);
 const hooks=await OpenAIDecisionsPlugin({}, {fetchImpl:async(_u,{headers,signal})=>{seen.push(headers.authorization);if(headers.authorization==='Bearer fake-A') return new Promise((_r,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason));firstStarted();});return Response.json(result);}});
 const a=await hooks.auth.loader(async()=>({type:'api',key:'fake-A'}));const b=await hooks.auth.loader(async()=>({type:'api',key:'fake-B'}));
 const ctl=new AbortController();const pending=a.fetch(BASE+'/systemone',{...request(),signal:ctl.signal});await ready;
 assert.equal((await b.fetch(BASE+'/systemone',request())).status,200);ctl.abort();await assert.rejects(pending,/cancelled/);assert.deepEqual(seen,['Bearer fake-A','Bearer fake-B']);
});
test('deadline and cancellation cover pending host authentication',async()=>{
 for(const cancel of [false,true]) {
 let calls=0;const hooks=await OpenAIDecisionsPlugin({}, {timeoutMs:15,fetchImpl:async()=>{calls++;throw new Error('must not send');}});
 const loader=await hooks.auth.loader(()=>new Promise(()=>{}));const ctl=new AbortController();
 const keepAlive=setTimeout(()=>{},200);
 try {const pending=loader.fetch(BASE+'/systemone',{...request(),signal:ctl.signal});if(cancel)setTimeout(()=>ctl.abort(),5);await assert.rejects(pending,/cancelled or timed out/);assert.equal(calls,0);} finally {clearTimeout(keepAlive);}
 }
});
test('invalid timeout configuration fails at plugin initialization',async()=>{
 for(const timeoutMs of [0,-1,0.5,Infinity,NaN,2147483648]) await assert.rejects(OpenAIDecisionsPlugin({}, {timeoutMs}),/Invalid timeout/);
});
test('malformed input never echoes private prompt fragments',async()=>{
 const hooks=await OpenAIDecisionsPlugin({});const loader=await hooks.auth.loader(()=>{throw new Error('must not read auth');});
 await assert.rejects(loader.fetch(BASE+'/systemone',{method:'POST',body:'PRIVATE_PROMPT_MARKER'}),e=>e.message==='Invalid JSON request'&&!String(e).includes('PRIVATE'));
});
