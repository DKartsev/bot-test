(function(){
  const token = window.AUTH_TOKEN || '';
  const auth = { 'Content-Type':'application/json', Authorization: token };
  const feed = document.getElementById('feed');
  const stats = document.getElementById('stats');

  function renderAsk(ev){
    const li = document.createElement('li');
    li.innerHTML = `<strong>${new Date(ev.ts).toLocaleTimeString()}</strong> `+
      `${ev.question} <span class="badge ${ev.source}">${ev.source}/${ev.method}</span> `+
      `<em>${ev.lang}</em> ${ev.score!==undefined?`(${ev.score.toFixed(2)})`:''}`;
    if(ev.pendingId){
      const a=document.createElement('button');a.textContent='Approve';a.onclick=()=>approve(ev.pendingId);
      const r=document.createElement('button');r.textContent='Reject';r.onclick=()=>reject(ev.pendingId);
      li.append(' ',a,' ',r);
    } else if(ev.itemId){
      const e=document.createElement('button');e.textContent='Edit';e.onclick=()=>edit(ev.itemId);
      li.append(' ',e);
    }
    feed.prepend(li);
  }

  function renderModeration(ev){
    const li=document.createElement('li');
    li.textContent=`[${new Date(ev.ts).toLocaleTimeString()}] moderation ${ev.action} ${ev.id}`;
    feed.prepend(li);
  }

  function renderFeedback(ev){
    const li=document.createElement('li');
    li.textContent=`[${new Date(ev.ts).toLocaleTimeString()}] feedback ${ev.responseId}`;
    feed.prepend(li);
  }

  function connect(){
    const url='/admin/stream?token='+encodeURIComponent(token.replace(/^Bearer\s+/i,''));
    const es=new EventSource(url);
    es.addEventListener('ask',e=>renderAsk(JSON.parse(e.data)));
    es.addEventListener('moderation',e=>renderModeration(JSON.parse(e.data)));
    es.addEventListener('feedback',e=>renderFeedback(JSON.parse(e.data)));
  }

  async function approve(id){
    await fetch(`/admin/qa/pending/${id}/approve`,{method:'POST',headers:auth,body:'{}'}).then(showToast);
  }
  async function reject(id){
    const reason=prompt('Reason?')||'';
    await fetch(`/admin/qa/pending/${id}/reject`,{method:'POST',headers:auth,body:JSON.stringify({reason})}).then(showToast);
  }
  async function edit(id){
    const q=prompt('Question?');
    const a=prompt('Answer?');
    if(!q||!a)return;
    await fetch(`/admin/qa/${id}`,{method:'PUT',headers:auth,body:JSON.stringify({Question:q,Answer:a})}).then(showToast);
  }
  document.getElementById('addBtn').onclick=async()=>{
    const q=prompt('Question?');
    const a=prompt('Answer?');
    const lang=prompt('Lang?')||'en';
    if(!q||!a)return;
    await fetch('/admin/qa',{method:'POST',headers:auth,body:JSON.stringify({Question:q,Answer:a,lang})}).then(showToast);
  };
  document.getElementById('exportXlsx').onclick=()=>download('/admin/export/xlsx','export.xlsx');
  document.getElementById('exportCsv').onclick=()=>download('/admin/export/csv','export.csv');
  document.getElementById('runSync').onclick=()=>post('/admin/sync/run');
  document.getElementById('recomputeFb').onclick=()=>post('/admin/feedback/recompute');

  async function post(url){
    await fetch(url,{method:'POST',headers:auth}).then(showToast);
  }

  async function download(url,name){
    const res=await fetch(url,{headers:{Authorization:token}});
    const blob=await res.blob();
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function showToast(){alert('ok');}

  async function loadStats(){
    const res=await fetch('/metrics');
    const m=await res.json();
    stats.textContent=`pending:${m.pendingTotal||0} openai:${m.openaiRate||0}`;
  }
  setInterval(loadStats,10000);loadStats();

  connect();
})();
