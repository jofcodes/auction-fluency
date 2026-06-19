// Auction Fluency – Portal app JS
// Single page app with localStorage progress, swipe nav, quiz engine

const DAYS = 5;
const STORAGE_KEY = 'auctionFluencyProgress';
let currentDay = 1;
let progress = loadProgress();
let touchStartX = 0;

function loadProgress(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {completed:[false,false,false,false,false], scores:{}, lastDay:1, overall:0}; }
  catch(e){ return {completed:[false,false,false,false,false], scores:{}, lastDay:1, overall:0}; }
}
function saveProgress(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); updateProgressBar(); }

function updateProgressBar(){
  const done = progress.completed.filter(Boolean).length;
  const pct = Math.round(done/DAYS*100);
  document.getElementById('progress-fill').style.width = pct+'%';
  document.getElementById('progress-text').textContent = pct+'% complete';
  progress.overall = pct;
}

function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showHome(){ showView('home-view'); renderHome(); }
function showModule(day){ currentDay=day; progress.lastDay=day; saveProgress(); showView('module-view'); loadDay(day); }
function showCheckpoint(){ showView('checkpoint-view'); loadCheckpoint(); }

function renderHome(){
  const container = document.getElementById('home-cards');
  container.innerHTML='';
  const titles = ['Auction Fundamentals','Bidding & Pacing','Full Funnel','Gradient Auction & OVAR','Simulation & GR2'];
  for(let i=1;i<=DAYS;i++){
    const done = progress.completed[i-1];
    const score = progress.scores['day'+i] || 0;
    const card = document.createElement('div');
    card.className = 'day-card'+(done?' completed':'');
    card.onclick = ()=>showModule(i);
    card.innerHTML = `<div><h3>Day ${i}: ${titles[i-1]}</h3><p>${done?'Completed':'Tap to start'}</p></div><div class="card-footer"><span>${score?score+'%':''}</span><span class="checkmark">${done?'✓':''}</span></div>`;
    container.appendChild(card);
  }
  const contBtn = document.getElementById('continue-btn');
  if(progress.lastDay>1 && progress.lastDay<=DAYS){
    contBtn.classList.remove('hidden');
    contBtn.onclick = ()=>showModule(progress.lastDay);
    contBtn.textContent = `Continue Day ${progress.lastDay} →`;
  } else { contBtn.classList.add('hidden'); }
  updateProgressBar();
}

async function loadDay(day){
  document.getElementById('day-label').textContent = 'Day '+day;
  try {
    const resp = await fetch('data/day'+day+'.json');
    const data = await resp.json();
    renderReading(data.readingLinks||[]);
    renderConcepts(data.concepts||[]);
    renderQuiz(data.quiz||[], day);
  } catch(e){
    document.getElementById('module-content').innerHTML = '<p>Error loading day '+day+'. Check assets/www/data/day'+day+'.json</p>';
  }
}

function renderReading(links){
  const el = document.getElementById('reading-links');
  el.innerHTML='';
  links.forEach(l=>{
    const a = document.createElement('a');
    a.className='reading-card'; a.href=l.url; a.target='_blank';
    a.innerHTML=`<div class="link-title">${l.title}</div><div class="link-url">${l.url}</div>`;
    el.appendChild(a);
  });
  if(!links.length) el.innerHTML='<p>No reading links for this day.</p>';
}
function renderConcepts(concepts){
  const el=document.getElementById('concepts-list'); el.innerHTML='';
  concepts.forEach(c=>{ const li=document.createElement('li'); li.textContent=c; el.appendChild(li); });
}

function renderQuiz(quiz, day){
  const container=document.getElementById('quiz-container');
  const result=document.getElementById('quiz-result');
  container.innerHTML=''; result.classList.add('hidden'); result.innerHTML='';
  let score=0; let answered=0; const total=quiz.length;

  quiz.forEach((q,idx)=>{
    const qDiv=document.createElement('div'); qDiv.className='quiz-q';
    if(q.type==='mc'){
      qDiv.innerHTML=`<h4>${idx+1}. ${q.question}</h4>`;
      q.options.forEach((opt,oi)=>{
        const btn=document.createElement('button');
        btn.className='quiz-option'; btn.textContent=opt;
        btn.onclick=()=>{
          if(btn.disabled) return;
          const all = qDiv.querySelectorAll('.quiz-option');
          all.forEach(b=>b.disabled=true);
          answered++;
          if(oi===q.correctIndex){ btn.classList.add('correct'); score++; }
          else { btn.classList.add('incorrect'); all[q.correctIndex].classList.add('correct'); }
          const exp=document.createElement('div'); exp.className='explanation'; exp.textContent=q.explanation||''; qDiv.appendChild(exp);
          checkDone();
        };
        qDiv.appendChild(btn);
      });
    } else if(q.type==='flashcard'){
      qDiv.innerHTML=`<h4>${idx+1}. Flashcard – tap to reveal</h4>`;
      const card=document.createElement('div'); card.className='flashcard';
      card.innerHTML=`<div class="front">${q.front}</div><div class="back">${q.back}</div>`;
      card.onclick=()=>{ card.classList.toggle('flipped'); if(!card.dataset.counted){answered++; card.dataset.counted=1; checkDone();}};
      qDiv.appendChild(card);
    } else if(q.type==='tf'){
      qDiv.innerHTML=`<h4>${idx+1}. True or False: ${q.statement}</h4>`;
      const wrap=document.createElement('div'); wrap.className='tf-buttons';
      ['True','False'].forEach((label,li)=>{
        const btn=document.createElement('button'); btn.className='btn'; btn.textContent=label;
        btn.onclick=()=>{
          if(btn.disabled) return;
          wrap.querySelectorAll('.btn').forEach(b=>b.disabled=true);
          answered++;
          const correct = (li===0)===q.answer;
          btn.style.background = correct ? 'var(--green)' : 'var(--orange)';
          const exp=document.createElement('div'); exp.className='explanation'; exp.textContent=q.why||''; qDiv.appendChild(exp);
          if(correct) score++;
          checkDone();
        };
        wrap.appendChild(btn);
      });
      qDiv.appendChild(wrap);
    }
    container.appendChild(qDiv);
  });

  function checkDone(){
    if(answered>=total){
      const pct=Math.round(score/total*100);
      progress.scores['day'+day]=pct;
      progress.completed[day-1]=true;
      saveProgress();
      result.classList.remove('hidden');
      result.innerHTML=`<div class="card"><h3>Day ${day} complete!</h3><p>Score: ${score}/${total} (${pct}%)</p><p>${day<5?'<button class="btn" onclick="navDay(1)">Next Day →</button>':'<button class="btn" onclick="showCheckpoint()">Go to Final Checkpoint →</button>'}</p></div>`;
      renderHome(); // update home in background
    }
  }
}

function navDay(delta){
  let next=currentDay+delta;
  if(next<1) next=1; if(next>DAYS) next=DAYS;
  showModule(next);
}

// Swipe navigation
document.addEventListener('touchstart', e=>{ touchStartX=e.touches[0].clientX; });
document.addEventListener('touchend', e=>{
  const dx=e.changedTouches[0].clientX - touchStartX;
  if(Math.abs(dx)>50 && document.getElementById('module-view').classList.contains('active')){
    navDay(dx<0?1:-1);
  }
});

// Offline indicator
function updateOnline(){ document.getElementById('offline-indicator').classList.toggle('hidden', navigator.onLine); }
window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);

// Checkpoint loading
async function loadCheckpoint(){
  try{
    const resp=await fetch('data/checkpoint.json'); const data=await resp.json();
    // ordering
    const pool=document.getElementById('ordering-pool');
    const sel=document.getElementById('ordering-selected');
    pool.innerHTML=''; sel.innerHTML=''; document.getElementById('ordering-feedback').innerHTML='';
    const items=[...data.ordering.items]; shuffle(items);
    items.forEach(text=>{
      const div=document.createElement('div'); div.className='order-item'; div.textContent=text;
      div.onclick=()=>{ if(div.parentElement===pool){sel.appendChild(div);} else {pool.appendChild(div);} };
      pool.appendChild(div);
    });
    window.checkOrdering = function(){
      const chosen=[...sel.children].map(c=>c.textContent);
      const correct=data.ordering.correctOrder;
      const fb=document.getElementById('ordering-feedback');
      if(JSON.stringify(chosen)===JSON.stringify(correct)){
        fb.innerHTML='<div class="explanation" style="border-color:var(--green)">Correct! Well done.</div>';
      } else {
        fb.innerHTML='<div class="explanation">Not quite. Correct order: '+correct.join(' → ')+'</div>';
      }
    };
    // explain back cards
    const ec=document.getElementById('explain-cards'); ec.innerHTML='';
    data.explainBack.forEach(item=>{
      const card=document.createElement('div'); card.className='flashcard';
      card.innerHTML=`<div class="front">${item.prompt}</div><div class="back">${item.modelAnswer}</div>`;
      card.onclick=()=>card.classList.toggle('flipped');
      ec.appendChild(card);
    });
    // open questions
    const oq=document.getElementById('open-questions'); oq.innerHTML='';
    data.openQuestions.forEach(q=>{ const li=document.createElement('li'); li.textContent=q; oq.appendChild(li); });
  }catch(e){ document.getElementById('checkpoint-content').innerHTML='<p>Error loading checkpoint.json</p>'; }
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

// Init
document.addEventListener('DOMContentLoaded', ()=>{ updateOnline(); renderHome(); updateProgressBar(); });
