// Auction Fluency – Portal app JS
// Single page app with localStorage progress, swipe nav, quiz engine
// Version 2.1 – professional learning guide UI with onboarding tour, stepper navigation, quiz progress dots review summary, flashcard confidence tracking, glossary alphabetical filter, settings modal, celebration animation, reading progress tracking, checkpoint hints, accessibility improvements for colorblind users

const DAYS = 5;
const STORAGE_KEY = 'auctionFluencyProgress';
const ONBOARDING_KEY = 'auctionFluencyOnboarded';
const READING_KEY = 'auctionFluencyReading';
const CONFIDENCE_KEY = 'auctionFluencyConfidence';
const APP_VERSION = '2.1.0';
let currentDay = 1;
let progress = loadProgress();
let readingProgress = loadReadingProgress();
let confidenceScores = loadConfidence();
let touchStartX = 0;
let currentQuizState = null;

const DAY_TITLES = ['Auction Fundamentals','Bidding & Pacing','Full Funnel','Gradient Auction & OVAR','Simulation & GR2'];
const DAY_TIMES = ['~15 min','~15 min','~15 min','~18 min','~20 min'];
const DAY_DIFFICULTY = ['Beginner','Beginner','Intermediate','Advanced','Advanced'];

const DAY_DATA = {
  1: {"title":"Day 1: Auction Fundamentals","topic":"Auction Fundamentals","readingLinks":[{"title":"Ads Ranking \u2013 Auction Wiki","url":"https://www.internalfb.com/wiki/Ads_Ranking/Auction/"},{"title":"Ads Ranking \u2013 Bidding Wiki","url":"https://www.internalfb.com/wiki/Ads_Ranking/Bidding/"}],"concepts":["Second-price auction: winner pays second highest bid, not their own \u2013 encourages truthful bidding.","VCG mechanism generalizes second-price to multiple slots with externality pricing \u2013 each advertiser pays harm caused to others.","Bid = value \u00d7 probability \u2013 advertiser value per outcome multiplied by predicted action rate (pCTR, pCVR).","Reserve prices set minimum clearing price per auction to protect user experience and publisher yield.","Auction density affects competition \u2013 more eligible ads increases price pressure and improves match quality.","Welfare maximization objective balances advertiser value, user relevance, and platform long-term health."],"quiz":[{"type":"mc","question":"In a second-price auction, what does the winner pay?","options":["Their own bid amount","The second highest bid amount","The average of all bids","A fixed reserve only"],"correctIndex":1,"explanation":"Second-price incentivizes truthful bidding because payment is decoupled from your stated bid \u2013 you pay the next best alternative."},{"type":"tf","statement":"VCG pricing means each winner pays the total harm their presence causes to other participants' total value.","answer":true,"why":"True. VCG computes externality \u2013 difference in total welfare with vs without you \u2013 generalizing second-price logic to multi-slot."},{"type":"flashcard","front":"Why is bid decomposed as value \u00d7 probability?","back":"Advertisers care about outcomes (clicks, conversions), not impressions. We predict p(action|impression) and multiply by advertiser-declared value per action to get expected value bid in impression auction. Separates prediction from valuation."},{"type":"mc","question":"What is the primary role of reserve prices?","options":["Increase advertiser ROI","Guarantee every auction has a winner","Set floor to protect UX and ensure minimum quality / yield","Replace bidding entirely"],"correctIndex":2,"explanation":"Reserves filter low-value ads, protect user experience from irrelevant ads, and ensure publisher doesn't sell inventory below opportunity cost."},{"type":"tf","statement":"Higher auction density generally leads to lower clearing prices.","answer":false,"why":"False \u2013 more competition pushes clearing price up toward true value, improving efficiency and yield (though diminishing returns exist)."}]},
  2: {"title":"Day 2: Bidding & Pacing","topic":"Bidding & Pacing","readingLinks":[{"title":"Ads Ranking \u2013 Pacing Wiki","url":"https://www.internalfb.com/wiki/Ads_Ranking/Pacing/"}],"concepts":["Wage and rate model: budget is wage, pacing system sets spend rate to smooth delivery across flight.","Budget pacing prevents early exhaustion \u2013 distributes impressions evenly to maximize learning and stable performance.","Bid shading lowers bid in first-price-like environments to avoid overpaying; throttling skips auctions entirely to control spend rate.","Bid landscape estimates win probability vs bid price \u2013 used to find efficient bid that meets delivery goal at minimal cost.","Delivery guarantees require pacing to adapt to supply volatility, competition shifts, and prediction errors in real time."],"quiz":[{"type":"mc","question":"What is the main goal of budget pacing?","options":["Spend budget as fast as possible","Smooth spend over time to maximize stable delivery and learning","Always bid maximum","Disable reserves"],"correctIndex":1,"explanation":"Pacing spreads budget to avoid early exhaustion, maintain consistent auction participation, and allow model learning throughout flight."},{"type":"flashcard","front":"Bid shading vs throttling \u2013 what's the difference?","back":"Bid shading reduces bid amount but still participates \u2013 you might win at lower price. Throttling skips the auction entirely \u2013 zero chance to win that impression, used when rate must drop sharply. Shading is finer control, throttling is coarser."},{"type":"tf","statement":"Wage in pacing model refers to total budget available, rate is spend per unit time.","answer":true,"why":"True. Wage = budget constraint, rate controller decides how fast to spend to hit smooth delivery target."},{"type":"mc","question":"Bid landscape helps pacing system to:","options":["Predict user age","Estimate win rate at different bid levels to choose efficient bid","Replace auction with fixed price","Ignore competition"],"correctIndex":1,"explanation":"Landscape maps bid \u2192 win probability and expected cost, letting pacer pick minimal bid achieving target delivery rate."},{"type":"tf","statement":"Pacing only needs to run once at campaign start.","answer":false,"why":"False \u2013 pacing is continuous feedback loop adjusting every few minutes to supply, competition, and performance changes."}]},
  3: {"title":"Day 3: Full Funnel","topic":"Full Funnel","readingLinks":[{"title":"Ads Ranking \u2013 Full Funnel Overview (internal search)","url":"https://www.internalfb.com/wiki/Ads_Ranking/"}],"concepts":["Full funnel spans impression \u2192 click \u2192 conversion \u2013 each stage has its own prediction model and optimization goal.","oCPM (optimized CPM) bids on impressions but optimizes toward downstream actions using predicted conversion rate.","Value optimization lets advertisers bid their true business value per conversion, not just volume \u2013 system maximizes total value not just count.","Attribution windows define how far back a click or view gets credit for conversion \u2013 affects signal and optimization stability.","Conversion modeling fills gaps from delayed, sparse, or missing conversion signals using statistical imputation and modeling."],"quiz":[{"type":"mc","question":"What does oCPM optimize for?","options":["Impressions only","Clicks or conversions predicted from impression using pCTR/pCVR","Lowest CPM regardless of outcome","Manual bid only"],"correctIndex":1,"explanation":"oCPM charges per impression but uses predicted action rate to bid toward downstream value \u2013 impression is proxy for expected outcome."},{"type":"flashcard","front":"Why use value optimization instead of conversion volume optimization?","back":"Not all conversions equal value \u2013 a $100 purchase vs $10 purchase. Value optimization bids proportional to expected revenue, maximizing advertiser ROAS and platform long-term value, not just count."},{"type":"tf","statement":"Attribution window length has no impact on optimization.","answer":false,"why":"False \u2013 longer windows capture more conversions but add noise and delay feedback; shorter windows are faster but miss delayed conversions. Tradeoff affects pacing stability."},{"type":"mc","question":"Conversion modeling is needed because:","options":["Conversions are always instantaneous and fully observed","Conversions can be delayed, sparse, or lost due to privacy constraints \u2013 modeling imputes missing signal","It replaces bidding","It disables pacing"],"correctIndex":1,"explanation":"Real-world conversion data is noisy and delayed. Modeling provides timely unbiased estimates for optimization loop."},{"type":"tf","statement":"Full funnel optimization means optimizing each stage independently without coordination.","answer":false,"why":"False \u2013 stages are linked. Impression bid must account for downstream click and conversion probabilities jointly to maximize end value."}]},
  4: {"title":"Day 4: Gradient Auction & OVAR","topic":"Gradient Auction & OVAR","readingLinks":[{"title":"WS1 Canonical Doc \u2013 Gradient Auction","url":"https://docs.google.com/document/d/1ZE-KcKbSMiJdV3QymbiG_VQJkUi8gFi79XMP-Oi58i8/edit"}],"concepts":["Gradient auction pilot moves from discrete auction steps to differentiable auction mechanics enabling gradient-based optimization end-to-end.","Generative auction vision uses generative models to synthesize candidate ads and auction parameters conditioned on context, expanding beyond fixed candidate set.","Organic Value Aligned Ranking (OVAR) aligns ads ranking objective with organic content value signals to improve long-term user experience, not just short-term advertiser value.","GR2 reward model provides learned reward balancing multiple objectives \u2013 advertiser value, user satisfaction, ecosystem health \u2013 as scalar for optimization.","Meta-optimization component tunes auction parameters across experiments using counterfactual estimates rather than manual grid search."],"quiz":[{"type":"mc","question":"What does gradient auction enable that traditional auction does not?","options":["Fixed manual rules only","End-to-end differentiable optimization of auction parameters via gradients","Elimination of bidding","Random ad selection"],"correctIndex":1,"explanation":"Differentiability allows gradient descent to tune auction mechanics jointly with ranking models, rather than separate heuristic steps."},{"type":"flashcard","front":"What is OVAR trying to solve?","back":"Traditional ads ranking optimizes advertiser value which can diverge from user organic experience. OVAR incorporates organic value signals \u2013 dwell time, satisfaction, long-term retention proxies \u2013 into ads ranking so ads feel native and preserve ecosystem health."},{"type":"tf","statement":"GR2 is a reward model that balances multiple objectives into single scalar for auction optimization.","answer":true,"why":"True. GR2 learns weights across advertiser value, user experience, diversity etc., providing unified reward for gradient-based tuning."},{"type":"mc","question":"Generative auction differs from classic auction by:","options":["Using only historical candidates","Synthesizing new ad candidates and parameters conditioned on user context via generative model","Removing ranking entirely","Bidding in dollars only"],"correctIndex":1,"explanation":"Generative approach expands candidate space beyond retrieved set, potentially creating better matched ads on the fly."},{"type":"tf","statement":"Meta-optimization means manually picking auction parameters once per quarter.","answer":false,"why":"False \u2013 it's automated continuous tuning using counterfactual estimates from experiments, not manual periodic picks."}]},
  5: {"title":"Day 5: Simulation & GR2","topic":"Simulation & GR2","readingLinks":[{"title":"Jo 30-60-90 Plan (context)","url":"https://docs.google.com/document/d/19zBkDTfJUfubH9TXIg0Z6Tu7nueaFA0EimIrlCv8gVc"}],"concepts":["Pacing simulator replays historical auction logs with counterfactual bids to estimate delivery and cost under new pacing policies without live traffic risk.","Experiment design for auction changes needs careful randomization unit \u2013 user, request, or advertiser \u2013 to avoid interference and spillover bias.","Counterfactual measurement uses replay or synthetic control to estimate what would have happened under alternative auction parameters.","Scaling from pilot to production requires staged rollout, guardrail metrics on user experience and advertiser value, and rollback criteria.","DPA test surfaces allow controlled evaluation of generative auction and OVAR changes on limited inventory before broad launch."],"quiz":[{"type":"mc","question":"Why use a pacing simulator instead of live A/B only?","options":["Simulators are slower","Simulators allow safe counterfactual exploration of many policy variants on historical data before risking live budget","Simulators replace auctions","Simulators increase cost"],"correctIndex":1,"explanation":"Replay simulation tests policy changes offline at scale, reducing risk and speeding iteration before live experiment."},{"type":"flashcard","front":"What is counterfactual measurement in auction experiments?","back":"Estimating outcome under alternative auction parameters that were not actually applied \u2013 via replay simulation, synthetic control groups, or instrumental variables \u2013 to attribute causal effect of change beyond simple A/B difference."},{"type":"tf","statement":"Scaling pilot to production should happen in one big switch for speed.","answer":false,"why":"False \u2013 staged rollout with guardrails allows detection of regressions in user experience or advertiser value before full impact. Rollback plan essential."},{"type":"mc","question":"Choosing randomization unit in auction experiment matters because:","options":["It has no effect","Wrong unit causes interference \u2013 e.g., user-level randomization can leak across auctions within same request, biasing results","It only affects UI color","It disables pacing"],"correctIndex":1,"explanation":"Auction interference violates SUTVA \u2013 careful unit choice (request, user, advertiser cluster) reduces spillover and gives valid causal estimates."},{"type":"tf","statement":"DPA test surfaces are used for controlled evaluation of new auction mechanisms on limited inventory.","answer":true,"why":"True \u2013 Dynamic Product Ads or similar controlled surfaces provide safer initial testbed before expanding to broad auction traffic."}]},
};
const CHECKPOINT_DATA = {"ordering":{"items":["Measurement","Ranking","Bid submission","Delivery","Pacing"],"correctOrder":["Bid submission","Pacing","Ranking","Delivery","Measurement"]},"explainBack":[{"prompt":"Explain second-price auction in your own words, then tap to compare.","modelAnswer":"Second-price: highest bidder wins but pays second-highest bid. Incentivizes truthful value revelation because payment independent of your bid as long as you win. VCG generalizes to multi-slot by charging externality."},{"prompt":"Explain bid = value \u00d7 probability decomposition.","modelAnswer":"Advertiser values outcomes not impressions. We predict probability of click/conversion given impression, multiply by advertiser value per outcome to get expected value bid. Separates ML prediction from business valuation."},{"prompt":"Explain OVAR purpose.","modelAnswer":"Organic Value Aligned Ranking aligns ads objective with organic content quality signals to protect long-term user experience, using GR2 reward model to balance advertiser value vs user satisfaction vs ecosystem health."},{"prompt":"Explain why pacing simulator is useful before live experiment.","modelAnswer":"Simulator replays historical logs with counterfactual bids to estimate delivery, cost, value under new policy safely offline, reducing risk and enabling many variants testing before live traffic exposure."}],"openQuestions":["How should GR2 reward weights trade off short-term advertiser value vs long-term user retention?","What guardrail metrics would trigger rollback of gradient auction pilot?","Which randomization unit minimizes interference for auction parameter experiments \u2013 request, user, or advertiser?","How do we validate counterfactual simulator accuracy against live A/B ground truth?","What DPA surfaces are best initial testbeds for generative auction expansion and why?"]};

function loadProgress(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {completed:[false,false,false,false,false], scores:{}, lastDay:1, overall:0, streak:0, lastStudyDate:null}; }
  catch(e){ return {completed:[false,false,false,false,false], scores:{}, lastDay:1, overall:0, streak:0, lastStudyDate:null}; }
}
function saveProgress(){
  const today = new Date().toDateString();
  if(progress.lastStudyDate !== today){
    const yesterday = new Date(Date.now()-86400000).toDateString();
    if(progress.lastStudyDate === yesterday){ progress.streak = (progress.streak||0)+1; }
    else if(!progress.lastStudyDate){ progress.streak = 1; }
    else { progress.streak = 1; }
    progress.lastStudyDate = today;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  updateProgressBar();
}

function updateProgressBar(){
  const done = progress.completed.filter(Boolean).length;
  const pct = Math.round(done/DAYS*100);
  const fillEl = document.getElementById('progress-fill');
  if(fillEl) fillEl.style.width = pct+'%';
  const textEl = document.getElementById('progress-text');
  if(textEl) textEl.textContent = pct+'% complete';
  progress.overall = pct;
  const streakEl = document.getElementById('streak-text');
  if(streakEl){ const s = progress.streak||0; streakEl.textContent = s>0 ? `🔥 ${s} day streak` : 'Start your streak!'; }
}

function showView(id){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showHome(){ showView('home-view'); renderHome(); }
function showModule(day){ currentDay=day; progress.lastDay=day; saveProgress(); showView('module-view'); loadDay(day); updateStepper('reading'); }
function showCheckpoint(){ showView('checkpoint-view'); loadCheckpoint(); }

function renderHome(){
  const container = document.getElementById('home-cards');
  container.innerHTML='';
  const titles = ['Auction Fundamentals','Bidding & Pacing','Full Funnel','Gradient Auction & OVAR','Simulation & GR2'];
  const times = ['~15 min','~15 min','~15 min','~18 min','~20 min'];
  const difficulty = ['Beginner','Beginner','Intermediate','Advanced','Advanced'];
  const completedCount = progress.completed.filter(Boolean).length;
  for(let i=1;i<=DAYS;i++){
    const done = progress.completed[i-1];
    const score = progress.scores['day'+i] || 0;
    const isCurrent = !done && (i===1 || progress.completed[i-2]);
    const isLocked = !done && i>1 && !progress.completed[i-2];
    const card = document.createElement('div');
    card.className = 'day-card' + (done?' completed':'') + (isCurrent?' current':'') + (isLocked?' locked':'');
    card.onclick = ()=>{ if(isLocked){ showLockedHint(i); } else { showModule(i); } };
    const ringClass = done ? 'filled' : '';
    const ringText = done ? '✓' : '';
    const lockOverlay = isLocked ? '<div class="lock-icon">🔒</div>' : '';
    const diffClass = difficulty[i-1]==='Beginner'?'green': difficulty[i-1]==='Intermediate'?'orange':'orange';
    card.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:flex-start;"><div><h3>Day ${i}: ${titles[i-1]} ${lockOverlay}</h3><div class="card-meta"><span class="badge blue">${times[i-1]}</span><span class="badge ${diffClass}">${difficulty[i-1]}</span>${done?'<span class="badge green">Completed</span>': isCurrent?'<span class="badge blue">Recommended next</span>':''}</div><p>${done?'Great job mastering these concepts! Tap to review.': isLocked?'Complete previous day to unlock — or tap to preview anyway':'Tap to start learning journey.'}</p></div><div class="progress-ring-small ${ringClass}">${ringText}</div></div><div class="card-footer"><span>${done? 'Score: '+score+'% — tap to review':'Start →'}</span><span class="checkmark">${done?'✓': isCurrent?'→':''}</span></div>`;
    container.appendChild(card);
  }
  const contBtn = document.getElementById('continue-btn');
  const nextDay = progress.completed.findIndex(c=>!c)+1 || DAYS;
  if(nextDay>1 && nextDay<=DAYS && completedCount < DAYS){
    contBtn.classList.remove('hidden');
    contBtn.onclick = ()=>showModule(nextDay);
    contBtn.textContent = `Continue Day ${nextDay} →`;
  } else if(completedCount===DAYS){
    contBtn.classList.remove('hidden');
    contBtn.onclick = ()=>showCheckpoint();
    contBtn.textContent = `🎓 View Final Checkpoint →`;
  } else {
    contBtn.classList.add('hidden');
  }
  updateProgressBar();
}

function showLockedHint(day){
  if(confirm('Day '+day+' is recommended after completing Day '+(day-1)+'. Open anyway to preview?')){
    showModule(day);
  }
}

function loadDay(day){
  document.getElementById('day-label').textContent = 'Day '+day;
  const moduleContent = document.getElementById('module-content');
  moduleContent.innerHTML = '<p style="text-align:center;padding:2rem;color:#606770;">Loading Day '+day+'...</p>';
  setTimeout(()=>{
    moduleContent.innerHTML = `
    <section id="reading-section"><div style="display:flex;justify-content:space-between;align-items:center;"><h2>Reading <span class="section-badge">~5 min</span></h2><span id="reading-progress" class="section-status">Not started</span></div><p style="font-size:16px;color:#606770;margin-bottom:0.8rem;">Tap cards below to open internal wiki links in browser. Requires corpnet Wi-Fi. Progress tracked automatically when tapped.</p><div id="reading-links"></div></section>
    <section id="concepts-section"><div style="display:flex;justify-content:space-between;align-items:center;"><h2>Key Concepts <span class="section-badge">~3 min</span></h2><span class="section-status">Review</span></div><p style="font-size:16px;color:#606770;margin-bottom:0.8rem;">Core takeaways distilled for quick recall. Tap glossary icon top bar anytime to look up terms.</p><ul id="concepts-list"></ul></section>
    <section id="quiz-section"><div style="display:flex;justify-content:space-between;align-items:center;"><h2>Quiz <span class="section-badge">~7 min</span></h2><span id="quiz-progress-text" class="section-status">Not started</span></div><div id="quiz-progress-dots" class="quiz-dots"></div><div id="quiz-container"></div><div id="quiz-result" class="hidden"></div><div id="quiz-review" class="hidden"></div></section>`;
    try {
      let data = DAY_DATA[day];
      if(!data) throw new Error('Day data not found in embedded DAY_DATA');
      if(!data.title || !Array.isArray(data.concepts) || !Array.isArray(data.quiz)) {
        throw new Error('Invalid JSON structure');
      }
      renderReading(data.readingLinks||[], day);
      renderConcepts(data.concepts||[]);
      renderQuiz(data.quiz||[], day);
      updateStepper('reading');
      setupScrollObserver();
    } catch(e){
      console.error('Failed to load day from embedded',e);
      // fallback to fetch for browser dev server
      fetch('data/day'+day+'.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).then(data=>{
        renderReading(data.readingLinks||[], day); renderConcepts(data.concepts||[]); renderQuiz(data.quiz||[],day); updateStepper('reading'); setupScrollObserver();
      }).catch(err=>{
        document.getElementById('module-content').innerHTML = '<div class="card" style="border-left:4px solid var(--orange)"><h3>Error loading Day '+day+'</h3><p>'+e.message+' ; '+err.message+'</p><button class="btn secondary" onclick="showHome()">← Back to Home</button></div>';
      });
    }
  },50);
}

function renderReading(links, day){
  const el = document.getElementById('reading-links');
  el.innerHTML='';
  const rp = readingProgress['day'+currentDay] || {};
  links.forEach((l,idx)=>{
    const visited = rp[idx];
    const a = document.createElement('a');
    a.className='reading-card' + (visited?' visited':'');
    a.href=l.url; a.target='_blank';
    a.onclick = ()=>{ if(!readingProgress['day'+currentDay]) readingProgress['day'+currentDay]={}; readingProgress['day'+currentDay][idx]=true; saveReadingProgress(); updateReadingProgressUI(); };
    a.innerHTML=`<div class="link-title">${visited?'✓ ':''}${l.title}</div><div class="link-url">${l.url}</div>`;
    el.appendChild(a);
  });
  if(!links.length) el.innerHTML='<p>No reading links for this day.</p>';
  updateReadingProgressUI();
}
function renderConcepts(concepts){
  const el=document.getElementById('concepts-list'); el.innerHTML='';
  concepts.forEach(c=>{ const li=document.createElement('li'); li.textContent=c; el.appendChild(li); });
}
function renderQuiz(quiz, day){
  const container=document.getElementById('quiz-container');
  const result=document.getElementById('quiz-result');
  const review=document.getElementById('quiz-review');
  container.innerHTML=''; result.classList.add('hidden'); result.innerHTML=''; if(review){review.classList.add('hidden'); review.innerHTML='';}
  let score=0; let answered=0; const total=quiz.length;
  currentQuizState={day:day,total:total,answers:[],questions:quiz};
  const dotsContainer=document.getElementById('quiz-progress-dots');
  if(dotsContainer){ dotsContainer.innerHTML=''; for(let i=0;i<total;i++){ const d=document.createElement('div'); d.className='quiz-dot'; d.id='qdot-'+i; dotsContainer.appendChild(d); } }
  function updateQP(done){ const el=document.getElementById('quiz-progress-text'); if(el) el.textContent=done+'/'+total+' answered'; for(let i=0;i<total;i++){ const dot=document.getElementById('qdot-'+i); if(dot) dot.classList.toggle('active', i===done); } }
  updateQP(0);
  quiz.forEach((q,idx)=>{
    const qDiv=document.createElement('div'); qDiv.className='quiz-q'; qDiv.id='q-'+idx;
    const counter=`<div style="font-size:14px;color:#606770;margin-bottom:0.3rem;">Question ${idx+1} of ${total}</div>`;
    if(q.type==='mc'){
      qDiv.innerHTML=counter+`<h4>${q.question}</h4>`;
      q.options.forEach((opt,oi)=>{
        const btn=document.createElement('button'); btn.className='quiz-option'; btn.textContent=opt; btn.setAttribute('aria-label','Option '+(oi+1));
        btn.onclick=()=>{
          if(btn.disabled) return;
          const all=qDiv.querySelectorAll('.quiz-option'); all.forEach(b=>b.disabled=true);
          answered++; const ok=oi===q.correctIndex;
          if(ok){ btn.classList.add('correct'); score++; } else { btn.classList.add('incorrect'); all[q.correctIndex].classList.add('correct'); }
          const dotEl=document.getElementById('qdot-'+idx); if(dotEl) dotEl.classList.add(ok?'correct':'incorrect');
          currentQuizState.answers[idx]={selected:oi,correct:ok,type:'mc'};
          const exp=document.createElement('div'); exp.className='explanation'; exp.innerHTML='<strong>'+(ok?'✓ Correct':'✕ Not quite')+'</strong><br>'+(q.explanation||''); qDiv.appendChild(exp);
          updateQP(answered); checkDone();
        }; qDiv.appendChild(btn);
      });
    } else if(q.type==='flashcard'){
      qDiv.innerHTML=counter+`<h4>Flashcard – tap card to flip, then rate confidence</h4>`;
      const wrap=document.createElement('div');
      wrap.innerHTML=`<div class="flashcard" id="fc-${idx}"><div class="flashcard-inner"><div class="front">${q.front}</div><div class="back">${q.back}</div></div></div><div class="confidence-row" id="conf-${idx}" style="display:none;"><button class="conf-btn" data-level="1" onclick="rateConfidence(${idx},1)">😊 Knew it</button><button class="conf-btn" data-level="2" onclick="rateConfidence(${idx},2)">🤔 Sort of</button><button class="conf-btn" data-level="3" onclick="rateConfidence(${idx},3)">😕 Didn't know</button></div>`;
      qDiv.appendChild(wrap);
      const card=qDiv.querySelector('.flashcard');
      card.onclick=()=>{ card.classList.toggle('flipped'); document.getElementById('conf-'+idx).style.display='flex'; if(!card.dataset.counted){ answered++; card.dataset.counted='1'; const dotEl=document.getElementById('qdot-'+idx); if(dotEl) dotEl.classList.add('correct'); currentQuizState.answers[idx]={selected:null,correct:true,type:'flashcard'}; updateQP(answered); checkDone(); } };
    } else if(q.type==='tf'){
      qDiv.innerHTML=counter+`<h4>True or False: ${q.statement}</h4>`;
      const wrap=document.createElement('div'); wrap.className='tf-buttons';
      ['True','False'].forEach((label,li)=>{
        const btn=document.createElement('button'); btn.className='btn'; btn.textContent=label;
        btn.onclick=()=>{
          if(btn.disabled) return;
          wrap.querySelectorAll('.btn').forEach(b=>{b.disabled=true; b.style.opacity='0.6';});
          btn.style.opacity='1'; answered++;
          const ok=(li===0)===q.answer;
          btn.style.background=ok?'var(--green)':'var(--orange)'; btn.style.color='white';
          const dotEl=document.getElementById('qdot-'+idx); if(dotEl) dotEl.classList.add(ok?'correct':'incorrect');
          currentQuizState.answers[idx]={selected:li,correct:ok,type:'tf'};
          const exp=document.createElement('div'); exp.className='explanation'; exp.innerHTML='<strong>'+(ok?'✓ Correct':'✕ Not quite')+'</strong><br>'+(q.why||''); qDiv.appendChild(exp);
          if(ok) score++; updateQP(answered); checkDone();
        }; wrap.appendChild(btn);
      }); qDiv.appendChild(wrap);
    }
    container.appendChild(qDiv);
  });
  function checkDone(){ if(answered>=total){ const pct=Math.round(score/total*100); progress.scores['day'+day]=pct; progress.completed[day-1]=true; saveProgress(); result.classList.remove('hidden'); showCelebration(day,score,total,pct); renderReviewSummary(); result.innerHTML=`<div class="card" style="border-left:5px solid var(--green);"><h3>✓ Day ${day} Complete!</h3><p>Score: ${score}/${total} (${pct}%)</p><p>${day<5?'<button class="btn" onclick="navDay(1)">Next Day →</button>':'<button class="btn" onclick="showCheckpoint()">Go to Final Checkpoint →</button>'} <button class="btn secondary" onclick="scrollToSection(\'quiz-review\')">Review Answers ↓</button></p></div>`; renderHome(); } }
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

// Onboarding overlay functions for first-time user tour
function showOnboarding(force=false){
  const onboarded = localStorage.getItem('auctionFluencyOnboarded');
  if(!force && onboarded==='true') return;
  const el = document.getElementById('onboarding-overlay');
  if(el) el.classList.remove('hidden');
}
function dismissOnboarding(permanent){
  const el = document.getElementById('onboarding-overlay');
  if(el) el.classList.add('hidden');
  if(permanent){ localStorage.setItem('auctionFluencyOnboarded','true'); }
}

// Glossary modal with alphabetical touch filter — no keyboard required per Portal spec
const GLOSSARY_FALLBACK = [
  {"term":"Second-Price Auction","def":"Winner pays second-highest bid, encouraging truthful bidding."},
  {"term":"VCG","def":"Vickrey-Clarke-Groves mechanism generalizing second-price to multi-slot via externality pricing."},
  {"term":"OVAR","def":"Organic Value Aligned Ranking aligning ads ranking with organic content value signals."},
  {"term":"GR2","def":"Second-generation reward model balancing multiple objectives for auction optimization."}
];
function openGlossary(){ const el=document.getElementById('glossary-overlay'); if(el){ el.classList.remove('hidden'); renderGlossary('All'); } }
function closeGlossary(){ const el=document.getElementById('glossary-overlay'); if(el) el.classList.add('hidden'); }
function renderGlossary(filter){
  const alphaContainer=document.getElementById('glossary-alpha');
  const listContainer=document.getElementById('glossary-list');
  if(!alphaContainer||!listContainer) return;
  const alphabet=['All','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  alphaContainer.innerHTML='';
  alphabet.forEach(letter=>{
    const btn=document.createElement('button');
    btn.className='alpha-btn'+(filter===letter?' active':'');
    btn.textContent=letter;
    btn.onclick=()=>renderGlossary(letter);
    alphaContainer.appendChild(btn);
  });
  const source = (typeof GLOSSARY_DATA !== 'undefined' ? GLOSSARY_DATA : GLOSSARY_FALLBACK);
  const terms = source.filter(item=> filter==='All' || item.term.toUpperCase().startsWith(filter) ).sort((a,b)=>a.term.localeCompare(b.term));
  listContainer.innerHTML='';
  if(terms.length===0){ listContainer.innerHTML='<p style="color:#606770;padding:1rem;">No terms starting with '+filter+'.</p>'; return; }
  terms.forEach(item=>{
    const div=document.createElement('div'); div.className='glossary-item';
    div.innerHTML=`<div class="glossary-term">${item.term}</div><div class="glossary-def">${item.def}</div>`;
    listContainer.appendChild(div);
  });
}

// Settings modal with version display and reset progress
function openSettings(){
  const el=document.getElementById('settings-overlay');
  if(!el) return;
  el.classList.remove('hidden');
  const verEl=document.getElementById('app-version-display');
  if(verEl) verEl.textContent = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1.2.0';
  const detail=document.getElementById('progress-detail');
  if(detail){
    const done=progress.completed.filter(Boolean).length;
    const totalScore=Object.values(progress.scores).reduce((a,b)=>a+b,0);
    const avg=done>0?Math.round(totalScore/done):0;
    const streak=progress.streak||0;
    detail.textContent=`Progress: ${done}/${DAYS} days completed, average score ${avg}%, current streak ${streak} day${streak!==1?'s':''}, last studied ${progress.lastStudyDate||'never'}.`;
  }
}
function closeSettings(){ const el=document.getElementById('settings-overlay'); if(el) el.classList.add('hidden'); }
function resetProgress(){
  if(confirm('Reset all progress to 0%? This cannot be undone. Your completed days, quiz scores, reading progress, and streak will be cleared.')){
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('auctionFluencyReading');
    localStorage.removeItem('auctionFluencyConfidence');
    localStorage.removeItem('auctionFluencyOnboarded');
    progress=loadProgress();
    closeSettings();
    showHome();
    setTimeout(()=>alert('Progress reset. Welcome back to fresh start!'),300);
  }
}

// Celebration overlay with simple confetti effect and personalized messaging for Jo as PM
function showCelebration(day, score, total, pct){
  const overlay=document.getElementById('celebration-overlay');
  if(!overlay) return;
  const titleEl=document.getElementById('celebration-title');
  const msgEl=document.getElementById('celebration-message');
  const detailEl=document.getElementById('celebration-detail');
  if(titleEl) titleEl.textContent = day===5 ? '🎓 Checkpoint Complete!' : `🎉 Day ${day} Complete!`;
  if(msgEl){
    const messages=[
      'Excellent work building auction fluency step by step — exactly the mindset needed as PM on Generative Auction team.',
      'Great job! You are building mental models that separate good PMs from great ones in ads ranking domain.',
      'Well done Jo! Each completed day compounds your ability to have sharp technical discussions with EM and tech leads.',
      'Fantastic progress! Your growing auction fluency directly translates to better product decisions for OVAR and GR2.'
    ];
    msgEl.textContent = messages[(day-1)%messages.length];
  }
  if(detailEl) detailEl.textContent = `Score ${score}/${total} (${pct}%) — ${pct>=80?'Strong mastery!':pct>=60?'Good understanding — review missed questions to strengthen.':'Keep practicing — review mode helps target weak spots.'}`;
  overlay.classList.remove('hidden');
  const card=overlay.querySelector('.celebration-card');
  if(card){
    for(let i=0;i<30;i++){ const conf=document.createElement('div'); conf.className='confetti'; conf.style.left=Math.random()*100+'%'; conf.style.top='10%'; conf.style.background=['#0064E0','#00a400','#ffcc00','#e87400','#ff6b9d'][Math.floor(Math.random()*5)]; conf.style.animationDelay=Math.random()*0.8+'s'; card.style.position='relative'; card.appendChild(conf); setTimeout(()=>conf.remove(),1500); }
  }
}
function closeCelebration(){ const el=document.getElementById('celebration-overlay'); if(el) el.classList.add('hidden'); }

// Stepper navigation update based on scroll position or explicit section jump
function updateStepper(step){
  document.querySelectorAll('.step-dot').forEach(d=>{
    d.classList.remove('active');
    if(d.dataset.step===step) d.classList.add('active');
  });
  const order=['reading','concepts','quiz'];
  const idx=order.indexOf(step);
  document.querySelectorAll('.step-line').forEach((line,i)=>{ line.classList.toggle('filled', i<idx); });
  document.querySelectorAll('.step-dot').forEach((dot,i)=>{ dot.classList.toggle('completed', i<idx); });
}
function scrollToSection(id){
  const el=document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
  if(id.includes('reading')) updateStepper('reading');
  else if(id.includes('concept')) updateStepper('concepts');
  else updateStepper('quiz');
}
function setupScrollObserver(){
  const secs=['reading-section','concepts-section','quiz-section'];
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const id=entry.target.id;
        if(id==='reading-section') updateStepper('reading');
        else if(id==='concepts-section') updateStepper('concepts');
        else if(id==='quiz-section') updateStepper('quiz');
      }
    });
  },{threshold:0.5});
  secs.forEach(id=>{ const el=document.getElementById(id); if(el) obs.observe(el); });
}

// Reading progress tracking separate from quiz completion
function loadReadingProgress(){ try{ return JSON.parse(localStorage.getItem('auctionFluencyReading'))||{}; }catch(e){ return {}; } }
let readingProgress = loadReadingProgress();
function saveReadingProgress(){ localStorage.setItem('auctionFluencyReading', JSON.stringify(readingProgress)); }
function markReadingVisited(day, idx){ const key='day'+day; if(!readingProgress[key]) readingProgress[key]={}; readingProgress[key][idx]=true; saveReadingProgress(); updateReadingProgressUI(); }
function updateReadingProgressUI(){ const rp=readingProgress['day'+currentDay]||{}; const total=(typeof DAY_DATA!=='undefined' && DAY_DATA[currentDay] && DAY_DATA[currentDay].readingLinks) ? DAY_DATA[currentDay].readingLinks.length : 0; const done=Object.keys(rp).length; const el=document.getElementById('reading-progress'); if(el){ el.textContent = total===0 ? 'N/A' : done+'/'+total+' visited'; el.style.color = (done===total && total>0) ? 'var(--green)' : 'var(--text-secondary)'; } }

// Confidence tracking for flashcards for metacognitive awareness building
function loadConfidence(){ try{ return JSON.parse(localStorage.getItem('auctionFluencyConfidence'))||{}; }catch(e){ return {}; } }
let confidenceScores = loadConfidence();
function saveConfidence(){ localStorage.setItem('auctionFluencyConfidence', JSON.stringify(confidenceScores)); }
function rateConfidence(qIdx, level){ const key='day'+currentDay+'_fc_'+qIdx; confidenceScores[key]=level; saveConfidence(); const row=document.getElementById('conf-'+qIdx); if(row){ row.querySelectorAll('.conf-btn').forEach(b=>b.classList.remove('selected')); const btn=row.querySelector('[data-level="'+level+'"]'); if(btn) btn.classList.add('selected'); } }
function rateConfidenceCheckpoint(idx, level){ const row=document.getElementById('ecc-'+idx); if(row){ row.querySelectorAll('.conf-btn').forEach(b=>b.classList.remove('selected')); const btn=row.querySelector('[data-level="'+level+'"]'); if(btn) btn.classList.add('selected'); } }

// Review summary rendering for quiz completion with accessibility icons for colorblind support
function renderReviewSummary(){
  if(typeof currentQuizState === 'undefined' || !currentQuizState) return;
  const el=document.getElementById('quiz-review');
  if(!el) return;
  el.classList.remove('hidden');
  let html='<div class="review-summary"><h3>Review Your Answers</h3><p style="font-size:15px;color:#606770;">Green check ✓ = correct, orange X = incorrect, gray dash = flashcard self-assessed. Icons support colorblind accessibility alongside colors.</p>';
  currentQuizState.questions.forEach((q,idx)=>{
    const ans=currentQuizState.answers[idx];
    let cls='skipped'; let icon='–'; let detail='Flashcard — self assess confidence above';
    if(ans && (ans.type==='mc' || ans.type==='tf')){
      cls = ans.correct ? 'correct' : 'incorrect';
      icon = ans.correct ? '✓' : '✕';
      detail = ans.correct ? 'Correct — well done!' : 'Incorrect — review explanation above to strengthen understanding';
    }
    const title = q.question || q.statement || q.front || 'Flash Đắk Card';
    // fix typo in fallback string to avoid confusion, use Flashcard
    const cleanTitle = (q.question||q.statement||q.front||'Flashcard').substring(0,80);
    const suffix = (q.question||q.statement||q.front||'').length>80?'...':'';
    html += `<div class="review-item"><div class="review-status ${cls}">${icon}</div><div class="review-q"><div class="review-q-title">Q${idx+1}: ${cleanTitle}${suffix}</div><div class="review-q-detail">${detail}</div></div></div>`;
  });
  const missed = currentQuizState.answers.filter(a=>a && !a.correct).length;
  html += `<div style="margin-top:1rem;display:flex;gap:0.8rem;flex-wrap:wrap;"><button class="btn secondary" onclick="retryMissed()">Retry Missed (${missed})</button><button class="btn secondary" onclick="document.getElementById('quiz-review').scrollIntoView({behavior:'smooth'})">Back to Top ↑</button></div></div>`;
  el.innerHTML = html;
}
function retryMissed(){
  alert('Retry missed functionality: in this version it prompts full retake for simplicity. Navigate away and back to Day '+currentDay+' to retake quiz fresh — your new score will update progress. Future enhancement will filter to missed questions only for focused practice.');
}

// Enhanced home rendering is already in current version via renderHome function updated earlier to support new card structure via JS injection — no change needed here as renderHome already handles enhanced cards via updated index.html structure expectation. Ensure renderHome is called on DOMContentLoaded with onboarding check.

document.addEventListener('DOMContentLoaded', ()=>{ updateOnline(); renderHome(); updateProgressBar(); setTimeout(()=>showOnboarding(false), 500); });
