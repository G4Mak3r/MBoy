export const millionaire = {
  id:'millionaire',title:'Симулятор миллионера',icon:'💸',players:1,duration:'10 минут и больше',description:'Начните с нуля, покупайте бизнесы и дойдите до миллиона.',
  mount(ctx){
    const defs=[
      {id:'skill',name:'Навык продаж',desc:'+1 ₽ за каждое нажатие',base:25,type:'click',value:1},
      {id:'coffee',name:'Кофейная точка',desc:'+5 ₽ в секунду',base:120,type:'passive',value:5},
      {id:'shop',name:'Интернет-магазин',desc:'+35 ₽ в секунду',base:850,type:'passive',value:35},
      {id:'factory',name:'Мини-фабрика',desc:'+220 ₽ в секунду',base:6200,type:'passive',value:220},
      {id:'holding',name:'Холдинг',desc:'+1600 ₽ в секунду',base:48000,type:'passive',value:1600}
    ];
    let state=ctx.storage.read(null)||{money:0,total:0,levels:{},last:Date.now(),won:false};
    let interval=null;
    function level(id){return state.levels[id]||0;}
    function cost(d){return Math.floor(d.base*Math.pow(1.72,level(d.id)));}
    function clickPower(){return 1+defs.filter(d=>d.type==='click').reduce((s,d)=>s+level(d.id)*d.value,0);}
    function income(){return defs.filter(d=>d.type==='passive').reduce((s,d)=>s+level(d.id)*d.value,0);}
    function fmt(n){if(n>=1e6)return`${(n/1e6).toFixed(n>=1e7?0:2)} млн ₽`;if(n>=1e3)return`${(n/1e3).toFixed(n>=1e5?0:1)} тыс ₽`;return`${Math.floor(n)} ₽`;}
    function save(){state.last=Date.now();ctx.storage.write(state);}
    function add(amount){state.money+=amount;state.total+=amount;if(state.total>=1e6&&!state.won){state.won=true;ctx.toast('Вы стали миллионером!');}save();renderValues();}
    function buy(id){const d=defs.find(x=>x.id===id),price=cost(d);if(state.money<price)return;state.money-=price;state.levels[id]=level(id)+1;save();render();}
    function applyOffline(){const now=Date.now(),seconds=Math.min(8*3600,Math.max(0,(now-(state.last||now))/1000)),earned=income()*seconds;if(earned>=1){state.money+=earned;state.total+=earned;ctx.toast(`Бизнес заработал ${fmt(earned)}`);}state.last=now;save();}
    function renderValues(){const m=ctx.root.querySelector('#money');const t=ctx.root.querySelector('#income');const p=ctx.root.querySelector('#millionProgress');if(m)m.textContent=fmt(state.money);if(t)t.textContent=`${fmt(income())}/сек · ${fmt(clickPower())}/нажатие`;if(p)p.style.width=`${Math.min(100,state.total/1000000*100)}%`;ctx.root.querySelectorAll('[data-buy]').forEach(b=>{const d=defs.find(x=>x.id===b.dataset.buy);b.disabled=state.money<cost(d);});}
    function render(){ctx.root.innerHTML=`<div class="game-shell"><div class="game-toolbar"><div class="game-status"><strong>${state.won?'Миллионер':'Путь к миллиону'}</strong><span id="income">${fmt(income())}/сек · ${fmt(clickPower())}/нажатие</span></div><button id="resetClicker" class="small-button">Сброс</button></div><div class="game-stage"><div class="clicker-wrap"><div class="money-card"><small>Капитал</small><strong id="money">${fmt(state.money)}</strong><div class="progress"><div id="millionProgress" style="width:${Math.min(100,state.total/1000000*100)}%"></div></div><p class="muted">До цели: ${fmt(Math.max(0,1000000-state.total))}</p></div><button id="work" class="click-main">Работать +${fmt(clickPower())}</button><div class="upgrades">${defs.map(d=>`<button class="upgrade" data-buy="${d.id}" ${state.money<cost(d)?'disabled':''}><div><h4>${d.name} · ур. ${level(d.id)}</h4><p>${d.desc}</p></div><div class="upgrade-cost">${fmt(cost(d))}</div></button>`).join('')}</div></div></div></div>`;ctx.root.querySelector('#work').addEventListener('click',()=>add(clickPower()));ctx.root.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>buy(b.dataset.buy)));ctx.root.querySelector('#resetClicker').addEventListener('click',()=>{const card=ctx.showModal(`<div class="modal-icon">🏚️</div><h2>Начать с нуля?</h2><p>Весь капитал и бизнесы будут удалены.</p><div class="button-row"><button id="no" class="secondary">Отмена</button><button id="yes" class="danger">Сбросить</button></div>`);card.querySelector('#no').addEventListener('click',ctx.closeModal);card.querySelector('#yes').addEventListener('click',()=>{state={money:0,total:0,levels:{},last:Date.now(),won:false};save();ctx.closeModal();render();});});}
    applyOffline();render();interval=setInterval(()=>{const inc=income();if(inc>0)add(inc);},1000);return()=>{clearInterval(interval);save();};
  },
  getStats(state){const n=state?.total||0;return{value:n>=1e6?`${(n/1e6).toFixed(1)} млн`:`${Math.floor(n/1000)} тыс`,label:'заработано всего'};}
};
