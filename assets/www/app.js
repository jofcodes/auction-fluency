// Auction Fluency – Portal app JS
// Single page app with localStorage progress, swipe nav, quiz engine
// Version 1.2 – embedded JSON data to avoid file:// fetch CORS issues on Portal WebView, robust error handling

const DAYS = 5;
const STORAGE_KEY = 'auctionFluencyProgress';
const APP_VERSION = '1.2.0';
let currentDay = 1;
let progress = loadProgress();
let touchStartX = 0;

const DAY_DATA = {
  1: {"title":"Day 1: Auction Fundamentals","topic":"Auction Fundamentals","readingLinks":[{"title":"Ads Ranking \u2013 Auction Wiki","url":"https://www.internalfb.com/wiki/Ads_Ranking/Auction/"},{"title":"Ads Ranking \u2013 Bidding Wiki","url":"https://www.internalfb.com/wiki/Ads_Ranking/Bidding/"}],"concepts":["Second-price auction: winner pays second highest bid, not their own \u2013 encourages truthful bidding.","VCG mechanism generalizes second-price to multiple slots with externality pricing \u2013 each advertiser pays harm caused to others.","Bid = value \u00d7 probability \u2013 advertiser value per outcome multiplied by predicted action rate (pCTR, pCVR).","Reserve prices set minimum clearing price per auction to protect user experience and publisher yield.","Auction density affects competition \u2013 more eligible ads increases price pressure and improves match quality.","Welfare maximization objective balances advertiser value, user relevance, and platform long-term health."],"quiz":[{"type":"mc","question":"In a second-price auction, what does the winner pay?","options":["Their own bid amount","The second highest bid amount","The average of all bids","A fixed reserve only"],"correctIndex":1,"explanation":"Second-price incentivizes truthful bidding because payment is decoupled from your stated bid \u2013 you pay the next best alternative."},{"type":"tf","statement":"VCG pricing means each winner pays the total harm their presence causes to other participants' total value.","answer":true,"why":"True. VCG computes externality \u2013 difference in total welfare with vs without you \u2013 generalizing second-price logic to multi-slot."},{"type":"flashcard","front":"Why is bid decomposed as value \u00d7 probability?","back":"Advertisers care about outcomes (clicks, conversions), not impressions. We predict p(action|impression) and multiply by advertiser-declared value per action to get expected value bid in impression auction. Separates prediction from valuation."},{"type":"mc","question":"What is the primary role of reserve prices?","options":["Increase advertiser ROI","Guarantee every auction has a winner","Set floor to protect UX and ensure minimum quality / yield","Replace bidding entirely"],"correctIndex":2,"explanation":"Reserves filter low-value ads, protect user experience from irrelevant ads, and ensure publisher doesn't sell inventory below opportunity cost."},{"type":"tf","statement":"Higher auction density generally leads to lower clearing prices.","answer":false,"why":"False \u2013 more competition pushes clearing price up toward true value, improving efficiency and yield (though diminishing returns exist)."}]},
  2: {"title":"Day 2: Bidding & Pacing","topic":"Bidding & Pacing","readingLinks":[{"title":"Ads Ranking \u2013 Pacing Wiki","url":"https://www.internalfb.com/wiki/Ads_Ranking/Pacing/"}],"concepts":["Wage and rate model: budget is wage, pacing system sets spend rate to smooth delivery across flight.","Budget pacing prevents early exhaustion \u2013 distributes impressions evenly to maximize learning and stable performance.","Bid shading lowers bid in first-price-like environments to avoid overpaying; throttling skips auctions entirely to control spend rate.","Bid landscape estimates win probability vs bid price \u2013 used to find efficient bid that meets delivery goal at minimal cost.","Delivery guarantees require pacing to adapt to supply volatility, competition shifts, and prediction errors in real time."],"quiz":[{"type":"mc","question":"What is the main goal of budget pacing?","options":["Spend budget as fast as possible","Smooth spend over time to maximize stable delivery and learning","Always bid maximum","Disable reserves"],"correctIndex":1,"explanation":"Pacing spreads budget to avoid early exhaustion, maintain consistent auction participation, and allow model learning throughout flight."},{"type":"flashcard","front":"Bid shading vs throttling \u2013 what's the difference?","back":"Bid shading reduces bid amount but still participates \u2013 you might win at lower price. Throttling skips the auction entirely \u2013 zero chance to win that impression, used when rate must drop sharply. Shading is finer control, throttling is coarser."},{"type":"tf","statement":"Wage in pacing model refers to total budget available, rate is spend per unit time.","answer":true,"why":"True. Wage = budget constraint, rate controller decides how fast to spend to hit smooth delivery target."},{"type":"mc","question":"Bid landscape helps pacing system to:","options":["Predict user age","Estimate win rate at different bid levels to choose efficient bid","Replace auction with fixed price","Ignore competition"],"correctIndex":1,"explanation":"Landscape maps bid \u2192 win probability and expected cost, letting pacer pick minimal bid achieving target delivery rate."},{"type":"tf","statement":"Pacing only needs to run once at campaign start.","answer":false,"why":"False \u2013 pacing is continuous feedback loop adjusting every few minutes to supply, competition, and performance changes."}]},
  3: {"title":"Day 3: Full Funnel","topic":"Full Funnel","readingLinks":[{"title":"Ads Ranking \u2013 Full Funnel Overview (internal search)","url":"https://www.internalfb.com/wiki/Ads_Ranking/"}],"concepts":["Full funnel spans impression \u2192 click \u2192 conversion \u2013 each stage has its own prediction model and optimization goal.","oCPM (optimized CPM) bids on impressions but optimizes toward downstream actions using predicted conversion rate.","Value optimization lets advertisers bid their true business value per conversion, not just volume \u2013 system maximizes total value not just count.","Attribution windows define how far back a click or view gets credit for conversion \u2013 affects signal and optimization stability.","Conversion modeling fills gaps from delayed, sparse, or missing conversion signals using statistical imputation and modeling."],"quiz":[{"type":"mc","question":"What does oCPM optimize for?","options":["Impressions only","Clicks or conversions predicted from impression using pCTR/pCVR","Lowest CPM regardless of outcome","Manual bid only"],"correctIndex":1,"explanation":"oCPM charges per impression but uses predicted action rate to bid toward downstream value \u2013 impression is proxy for expected outcome."},{"type":"flashcard","front":"Why use value optimization instead of conversion volume optimization?","back":"Not all conversions equal value \u2013 a $100 purchase vs $10 purchase. Value optimization bids proportional to expected revenue, maximizing advertiser ROAS and platform long-term value, not just count."},{"type":"tf","statement":"Attribution window length has no impact on optimization.","answer":false,"why":"False \u2013 longer windows capture more conversions but add noise and delay feedback; shorter windows are faster but miss delayed conversions. Tradeoff affects pacing stability."},{"type":"mc","question":"Conversion modeling is needed because:","options":["Conversions are always instantaneous and fully observed","Conversions can be delayed, sparse, or lost due to privacy constraints \u2013 modeling imputes missing signal","It replaces bidding","It disables pacing"],"correctIndex":1,"explanation":"Real-world conversion data is noisy and delayed. Modeling provides timely unbiased estimates for optimization loop."},{"type":"tf","statement":"Full funnel optimization means optimizing each stage independently without coordination.","answer":false,"why":"False \u2013 stages are linked. Impression bid must account for downstream click and conversion probabilities jointly to maximize end value."}]},
  4: {"title":"Day 4: Gradient Auction & OVAR","topic":"Gradient Auction & OVAR","readingLinks":[{"title":"WS1 Canonical Doc \u2013 Gradient Auction","url":"https://docs.google.com/document/d/1ZE-KcKbSMiJdV3QymbiG_VQJkUi8gFi79XMP-Oi58i8/edit"}],"concepts":["Gradient auction pilot moves from discrete auction steps to differentiable auction mechanics enabling gradient-based optimization end-to-end.","Generative auction vision uses generative models to synthesize candidate ads and auction parameters conditioned on context, expanding beyond fixed candidate set.","Organic Value Aligned Ranking (OVAR) aligns ads ranking objective with organic content value signals to improve long-term user experience, not just short-term advertiser value.","GR2 reward model provides learned reward balancing multiple objectives \u2013 advertiser value, user satisfaction, ecosystem health \u2013 as scalar for optimization.","Meta-optimization component tunes auction parameters across experiments using counterfactual estimates rather than manual grid search."],"quiz":[{"type":"mc","question":"What does gradient auction enable that traditional auction does not?","options":["Fixed manual rules only","End-to-end differentiable optimization of auction parameters via gradients","Elimination of bidding","Random ad selection"],"correctIndex":1,"explanation":"Differentiability allows gradient descent to tune auction mechanics jointly with ranking models, rather than separate heuristic steps."},{"type":"flashcard","front":"What is OVAR trying to solve?","back":"Traditional ads ranking optimizes advertiser value which can diverge from user organic experience. OVAR incorporates organic value signals \u2013 dwell time, satisfaction, long-term retention proxies \u2013 into ads ranking so ads feel native and preserve ecosystem health."},{"type":"tf","statement":"GR2 is a reward model that balances multiple objectives into single scalar for auction optimization.","answer":true,"why":"True. GR2 learns weights across advertiser value, user experience, diversity etc., providing unified reward for gradient-based tuning."},{"type":"mc","question":"Generative auction differs from classic auction by:","options":["Using only historical candidates","Synthesizing new ad candidates and parameters conditioned on user context via generative model","Removing ranking entirely","Bidding in dollars only"],"correctIndex":1,"explanation":"Generative approach expands candidate space beyond retrieved set, potentially creating better matched ads on the fly."},{"type":"tf","statement":"Meta-optimization means manually picking auction parameters once per quarter.","answer":false,"why":"False \u2013 it's automated continuous tuning using counterfactual estimates from experiments, not manual periodic picks."}]},
  5: {"title":"Day 5: Simulation & GR2","topic":"Simulation & GR2","readingLinks":[{"title":"Jo 30-60-90 Plan (context)","url":"https://docs.google.com/document/d/19zBkDTfJUfubH9TXIg0Z6Tu7nueaFA0EimIrlCv8gVc"}],"concepts":["Pacing simulator replays historical auction logs with counterfactual bids to estimate delivery and cost under new pacing policies without live traffic risk.","Experiment design for auction changes needs careful randomization unit \u2013 user, request, or advertiser \u2013 to avoid interference and spillover bias.","Counterfactual measurement uses replay or synthetic control to estimate what would have happened under alternative auction parameters.","Scaling from pilot to production requires staged rollout, guardrail metrics on user experience and advertiser value, and rollback criteria.","DPA test surfaces allow controlled evaluation of generative auction and OVAR changes on limited inventory before broad launch."],"quiz":[{"type":"mc","question":"Why use a pacing simulator instead of live A/B only?","options":["Simulators are slower","Simulators allow safe counterfactual exploration of many policy variants on historical data before risking live budget","Simulators replace auctions","Simulators increase cost"],"correctIndex":1,"explanation":"Replay simulation tests policy changes offline at scale, reducing risk and speeding iteration before live experiment."},{"type":"flashcard","front":"What is counterfactual measurement in auction experiments?","back":"Estimating outcome under alternative auction parameters that were not actually applied \u2013 via replay simulation, synthetic control groups, or instrumental variables \u2013 to attribute causal effect of change beyond simple A/B difference."},{"type":"tf","statement":"Scaling pilot to production should happen in one big switch for speed.","answer":false,"why":"False \u2013 staged rollout with guardrails allows detection of regressions in user experience or advertiser value before full impact. Rollback plan essential."},{"type":"mc","question":"Choosing randomization unit in auction experiment matters because:","options":["It has no effect","Wrong unit causes interference \u2013 e.g., user-level randomization can leak across auctions within same request, biasing results","It only affects UI color","It disables pacing"],"correctIndex":1,"explanation":"Auction interference violates SUTVA \u2013 careful unit choice (request, user, advertiser cluster) reduces spillover and gives valid causal estimates."},{"type":"tf","statement":"DPA test surfaces are used for controlled evaluation of new auction mechanisms on limited inventory.","answer":true,"why":"True \u2013 Dynamic Product Ads or similar controlled surfaces provide safer initial testbed before expanding to broad auction traffic."}]},
};
const CHECKPOINT_DATA = {"ordering":{"items":["Measurement","Ranking","Bid submission","Delivery","Pacing"],"correctOrder":["Bid submission","Pacing","Ranking","Delivery","Measurement"]},"explainBack":[{"prompt":"Explain second-price auction in your own words, then tap to compare.","modelAnswer":"Second-price: highest bidder wins but pays second-highest bid. Incentivizes truthful value revelation because payment independent of your bid as long as you win. VCG generalizes to multi-slot by charging externality."},{"prompt":"Explain bid = value \u00d7 probability decomposition.","modelAnswer":"Advertiser values outcomes not impressions. We predict probability of click/conversion given impression, multiply by advertiser value per outcome to get expected value bid. Separates ML prediction from business valuation."},{"prompt":"Explain OVAR purpose.","modelAnswer":"Organic Value Aligned Ranking aligns ads objective with organic content quality signals to protect long-term user experience, using GR2 reward model to balance advertiser value vs user satisfaction vs ecosystem health."},{"prompt":"Explain why pacing simulator is useful before live experiment.","modelAnswer":"Simulator replays historical logs with counterfactual bids to estimate delivery, cost, value under new policy safely offline, reducing risk and enabling many variants testing before live traffic exposure."}],"openQuestions":["How should GR2 reward weights trade off short-term advertiser value vs long-term user retention?","What guardrail metrics would trigger rollback of gradient auction pilot?","Which randomization unit minimizes interference for auction parameter experiments \u2013 request, user, or advertiser?","How do we validate counterfactual simulator accuracy against live A/B ground truth?","What DPA surfaces are best initial testbeds for generative auction expansion and why?"]};

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

function loadDay(day){
  document.getElementById('day-label').textContent = 'Day '+day;
  const moduleContent = document.getElementById('module-content');
  moduleContent.innerHTML = '<p style="text-align:center;padding:2rem;color:#606770;">Loading Day '+day+'...</p>';
  setTimeout(()=>{
    moduleContent.innerHTML = `
    <section id="reading-section"><h2>Reading</h2><div id="reading-links"></div></section>
    <section id="concepts-section"><h2>Key Concepts</h2><ul id="concepts-list"></ul></section>
    <section id="quiz-section"><h2>Quiz</h2><div id="quiz-container"></div><div id="quiz-result" class="hidden"></div></section>`;
    try {
      let data = DAY_DATA[day];
      if(!data) throw new Error('Day data not found in embedded DAY_DATA');
      if(!data.title || !Array.isArray(data.concepts) || !Array.isArray(data.quiz)) {
        throw new Error('Invalid JSON structure');
      }
      renderReading(data.readingLinks||[]);
      renderConcepts(data.concepts||[]);
      renderQuiz(data.quiz||[], day);
    } catch(e){
      console.error('Failed to load day from embedded',e);
      // fallback to fetch for browser dev server
      fetch('data/day'+day+'.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(data=>{
        renderReading(data.readingLinks||[]); renderConcepts(data.concepts||[]); renderQuiz(data.quiz||[],day);
      }).catch(err=>{
        document.getElementById('module-content').innerHTML = '<div class="card" style="border-left:4px solid var(--orange)"><h3>Error loading Day '+day+'</h3><p>'+e.message+' ; '+err.message+'</p><button class="btn secondary" onclick="showHome()">← Back to Home</button></div>';
      });
    }
  },50);
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
      renderHome();
    }
  }
}

function navDay(delta){
  let next=currentDay+delta;
  if(next<1) next=1; if(next>DAYS) next=DAYS;
  showModule(next);
}

document.addEventListener('touchstart', e=>{ touchStartX=e.touches[0].clientX; });
document.addEventListener('touchend', e=>{
  const dx=e.changedTouches[0].clientX - touchStartX;
  if(Math.abs(dx)>50 && document.getElementById('module-view').classList.contains('active')){
    navDay(dx<0?1:-1);
  }
});

function updateOnline(){
  const el = document.getElementById('offline-indicator');
  const online = navigator.onLine;
  el.classList.toggle('hidden', online);
  if(!online){ el.textContent = 'Offline – quizzes work fully offline. Reading links need corpnet Wi-Fi.'; }
}
window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);
setTimeout(updateOnline, 500);

async function loadCheckpoint(){
  const container = document.getElementById('checkpoint-content');
  container.innerHTML = '<p style="text-align:center;padding:2rem;color:#606770;">Loading checkpoint...</p>';
  setTimeout(()=>{
  try{
    let data = CHECKPOINT_DATA;
    if(!data || !data.ordering) throw new Error('Checkpoint data missing');
    container.innerHTML = `<section><h3>Ordering Exercise</h3><p>Tap items in correct auction pipeline order:</p><div id="ordering-pool" class="ordering-pool"></div><div id="ordering-selected" class="ordering-selected"></div><button class="btn" onclick="checkOrdering()">Check Order</button><div id="ordering-feedback"></div></section><section><h3>Explain-Back Flashcards</h3><div id="explain-cards"></div></section><section><h3>Open Questions for Team</h3><ul id="open-questions"></ul></section>`;
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
    const ec=document.getElementById('explain-cards'); ec.innerHTML='';
    data.explainBack.forEach(item=>{
      const card=document.createElement('div'); card.className='flashcard';
      card.innerHTML=`<div class="front">${item.prompt}</div><div class="back">${item.modelAnswer}</div>`;
      card.onclick=()=>card.classList.toggle('flipped');
      ec.appendChild(card);
    });
    const oq=document.getElementById('open-questions'); oq.innerHTML='';
    data.openQuestions.forEach(q=>{ const li=document.createElement('li'); li.textContent=q; oq.appendChild(li); });
  }catch(e){
    console.error('Checkpoint failed',e);
    document.getElementById('checkpoint-content').innerHTML='<div class="card" style="border-left:4px solid var(--orange)"><h3>Error loading checkpoint</h3><p>'+e.message+'</p><button class="btn secondary" onclick="showHome()">← Back to Home</button></div>';
  }
  },50);
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

document.addEventListener('DOMContentLoaded', ()=>{ updateOnline(); renderHome(); updateProgressBar(); });
