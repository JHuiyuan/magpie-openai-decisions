export const BASE = 'https://api.openai.com/v1';
const ID = 'openai-decisions';
const MODEL = 'gpt-6-luna';
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const check = (x, message) => { if (!x) throw new Error(message); };
const probability = x => Number.isFinite(x) && x >= 0 && x <= 1;
export function encode(body) {
  check(object(body) && body.model === MODEL && Object.hasOwn(body, 'state') && object(body.questions), 'Invalid System One request');
  check(Object.keys(body).every(k=>['model','state','questions'].includes(k)), 'Unsupported request field');
  const entries = Object.entries(body.questions);
  check(entries.length > 0 && entries.length <= 400, 'Expected 1–400 questions');
  const questions = entries.map(([name,q]) => {
    check(name.length > 0 && object(q) && typeof q.instructions === 'string' && q.instructions.trim(), 'Invalid question');
    check(Object.keys(q).every(k => ['type','instructions','criteria'].includes(k)), 'Unsupported question field');
    const out = {name, instructions:q.instructions};
    if (q.type === 'noul' || q.type === 'predicate') { check(q.criteria === undefined, 'Predicate criteria unsupported'); return {...out,type:'predicate'}; }
    if(q.type === 'choice') {
      check(object(q.criteria) && Object.keys(q.criteria).length >= 2 && Object.keys(q.criteria).length <= 255, 'Choice requires 2–255 criteria');
      return {...out,type:'choice',choices:Object.entries(q.criteria).map(([value,d]) => {
        check(d === null || typeof d === 'string', 'Unsupported choice criterion');
        return {value,...(d === null ? {} : {description:String(d)})};
      })};
    }
    if(q.type === 'score') {
      check(Array.isArray(q.criteria) && q.criteria.length >= 2 && q.criteria.length <= 10 && q.criteria.every(x=>typeof x === 'string' && x.trim()), 'Only 2–10 ordered score criteria are supported');
      return {...out,type:'score',levels:q.criteria.map((description,i)=>({label:String(i),description}))};
    }
    throw new Error('Unsupported question type');
  });
  check(typeof body.state === 'string' || object(body.state), 'Unsupported state');
  return {model:MODEL,input:typeof body.state === 'string' ? body.state : [{role:'user',content:[{type:'input_json',data:body.state}]}],questions};
}
export function decode(data, request) {
  check(object(data) && (data.model === undefined || data.model === MODEL), 'Unexpected response model');
  check(Array.isArray(data?.answers) && data.answers.length === request.questions.length, 'Incomplete answers');
  check(data.answers.every(object), 'Malformed answer');
  const answers = Object.create(null);
  for (const q of request.questions) {
    const matches = data.answers.filter(a=>a.name === q.name);
    check(matches.length === 1, 'Missing or duplicate answer');
    const a = matches[0];
    check(a.type !== 'refusal', 'Decision refused');
    check(a.type === q.type, 'Unexpected answer type');
    if(q.type === 'predicate') { check(probability(a.probability), 'Invalid probability'); answers[q.name]={noul:a.probability}; continue; }
    check(probability(a.confidence), 'Invalid confidence');
    if(q.type === 'score') {
      check(Number.isFinite(a.score) && a.score >= 0 && a.score <= q.levels.length-1, 'Invalid score');
      const ps=distribution(a.probabilities,q.levels.map((_,i)=>i));
      const mean=Object.entries(ps).reduce((sum,[i,p])=>sum+Number(i)*p,0);
      check(Math.abs(mean-a.score)<0.001, 'Inconsistent score');
      answers[q.name]={score:a.score,confidence:a.confidence,probabilities:ps}; continue;
    }
    const values=q.choices.map(c=>c.value);
    check(values.includes(a.choice) && Array.isArray(a.probabilities) && a.probabilities.length === values.length, 'Invalid choice');
    const ps=Object.create(null);
    for(const p of a.probabilities) { check(values.includes(p.value) && !Object.hasOwn(ps,p.value) && probability(p.probability), 'Invalid distribution'); ps[p.value]=p.probability; }
    check(Math.abs(Object.values(ps).reduce((s,p)=>s+p,0)-1)<0.001, 'Unnormalized distribution');
    answers[q.name]={choice:a.choice,confidence:a.confidence,probabilities:ps};
  }
  const out={model:MODEL,answers};
  if(data.usage !== undefined) {
    check(object(data.usage), 'Invalid usage');
    const usage={};
    for(const k of ['input_tokens','output_tokens','total_tokens']) if(data.usage[k] !== undefined) { check(Number.isSafeInteger(data.usage[k]) && data.usage[k]>=0,'Invalid usage'); usage[k]=data.usage[k]; }
    for(const [group,fields] of [['input_tokens_details',['cached_tokens','cache_write_tokens']],['output_tokens_details',['reasoning_tokens']]]) {
      if(data.usage[group]===undefined) continue;
      check(object(data.usage[group]),'Invalid usage'); usage[group]={};
      for(const k of fields) if(data.usage[group][k]!==undefined) {const n=data.usage[group][k];check(Number.isSafeInteger(n)&&n>=0,'Invalid usage');usage[group][k]=n;}
    }
    out.usage=usage;
  }
  return out;
}
function distribution(ps,values) {
  check(Array.isArray(ps)&&ps.length===values.length,'Incomplete distribution');
  const out=Object.create(null);
  for(const p of ps) {check(object(p)&&values.includes(p.value)&&!Object.hasOwn(out,p.value)&&probability(p.probability),'Invalid distribution');out[p.value]=p.probability;}
  check(Math.abs(Object.values(out).reduce((s,p)=>s+p,0)-1)<0.001,'Unnormalized distribution');return out;
}
// Every asynchronous phase observes the same deadline, including host auth.
function abortable(promise,signal) {
  return new Promise((resolve,reject)=>{
    const abort=()=>{cleanup();reject(new Error('Decision request cancelled or timed out'));};
    const cleanup=()=>signal.removeEventListener('abort',abort);
    signal.addEventListener('abort',abort,{once:true});
    Promise.resolve(promise).then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
    if(signal.aborted) abort();
  });
}
export async function OpenAIDecisionsPlugin(_input, {fetchImpl=fetch,timeoutMs=30000}={}) {
  check(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 2147483647, 'Invalid timeout');
  const models = {[MODEL]:{id:MODEL,name:'OpenAI Decisions',decides:true,api:{id:MODEL,url:BASE,npm:'@ai-sdk/openai-compatible'}}};
  return {
    async config(cfg) { cfg.provider ??= {}; cfg.provider[ID]={name:'OpenAI Decisions',npm:'@ai-sdk/openai-compatible',api:BASE,decide:true,models}; },
    provider:{id:ID,async models(){ return structuredClone(models); }},
    auth:{provider:ID,methods:[{type:'api',label:'OpenAI API key',placeholder:'Enter your existing OpenAI project API key'}],async loader(getAuth){
      return {baseURL:BASE,async fetch(input,init){
        const req=new Request(input,init);
        check(req.url === BASE+'/systemone' && req.method === 'POST', 'Unsupported endpoint');
        const signal=AbortSignal.any([req.signal,AbortSignal.timeout(timeoutMs)]);
        check(!signal.aborted,'Decision request cancelled or timed out');
        let parsed;
        try {parsed=await abortable(req.json(),signal);} catch {throw new Error(signal.aborted?'Decision request cancelled or timed out':'Invalid JSON request');}
        const body=encode(parsed);
        let auth;
        try {auth=await abortable(getAuth(),signal);} catch {throw new Error(signal.aborted?'Decision request cancelled or timed out':'Unable to read Magpie authentication');}
        check(auth?.type === 'api' && typeof auth.key === 'string' && auth.key.trim(), 'Log in with an API key in Magpie');
        try {
          signal.throwIfAborted();
          const res=await abortable(fetchImpl(BASE+'/decisions',{method:'POST',headers:{authorization:'Bearer '+auth.key,'content-type':'application/json'},body:JSON.stringify(body),signal,redirect:'error'}),signal);
          if(!res.ok) {await abortable(res.body?.cancel(),signal);return Response.json({error:{message:'OpenAI Decisions request failed',status:res.status}},{status:res.status >=400 ? res.status : 502});}
          const data=await abortable(res.json(),signal);signal.throwIfAborted();return Response.json(decode(data,body));
        } catch { throw new Error(signal.aborted ? 'Decision request cancelled or timed out' : 'Invalid or unavailable Decisions response'); }
      }};
    }}
  };
}
