const FLEET = [
  {id:'s4',name:'Линкор',size:4},
  {id:'s3a',name:'Крейсер',size:3},{id:'s3b',name:'Крейсер',size:3},
  {id:'s2a',name:'Эсминец',size:2},{id:'s2b',name:'Эсминец',size:2},{id:'s2c',name:'Эсминец',size:2},
  {id:'s1a',name:'Катер',size:1},{id:'s1b',name:'Катер',size:1},{id:'s1c',name:'Катер',size:1},{id:'s1d',name:'Катер',size:1}
];
const N=10;
const emptyShots=()=>Array.from({length:N},()=>Array(N).fill(0));
const player=name=>({name,ships:[],shots:emptyShots()});

export const battleship={
  id:'battleship',title:'Морской бой',icon:'⚓',players:2,duration:'15–30 минут',description:'Скрытые флоты, по одному выстрелу за ход.',
  mount(ctx){
    const settings=ctx.settings();
    let state=ctx.storage.read(null);
    if(!state?.players||state.players.length!==2) state=fresh(settings,{wins:[0,0],games:0});
    let preview=[];

    function fresh(s,stats){return{phase:'setup',placementPlayer:0,current:0,selected:FLEET[0].id,orientation:'h',players:[player(s.player1),player(s.player2)],lastResult:'',winner:null,stats:stats||{wins:[0,0],games:0}};}
    function save(){ctx.storage.write(state);}
    function key(r,c){return`${r}:${c}`;}
    function cellsFor(r,c,size,o){return Array.from({length:size},(_,i)=>o==='h'?[r,c+i]:[r+i,c]);}
    function occupied(p,ignore=null){const set=new Set();p.ships.forEach(s=>{if(s.id!==ignore)s.cells.forEach(([r,c])=>set.add(key(r,c)));});return set;}
    function valid(p,cells,ignore=null){const occ=occupied(p,ignore);for(const[r,c]of cells){if(r<0||r>=N||c<0||c>=N||occ.has(key(r,c)))return false;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(occ.has(key(r+dr,c+dc)))return false;}return true;}
    function grid(p){const out=Array.from({length:N},()=>Array(N).fill(false));p.ships.forEach(s=>s.cells.forEach(([r,c])=>out[r][c]=true));return out;}
    function shipAt(p,r,c){return p.ships.find(s=>s.cells.some(([sr,sc])=>sr===r&&sc===c));}
    function sunk(s){return s.hits?.length>=s.size;}
    function alive(p){return p.ships.filter(s=>!sunk(s)).length;}
    function nextUnplaced(p){return FLEET.find(d=>!p.ships.some(s=>s.id===d.id))?.id||null;}
    function place(r,c){const p=state.players[state.placementPlayer],def=FLEET.find(d=>d.id===state.selected);if(!def)return;const cells=cellsFor(r,c,def.size,state.orientation);if(!valid(p,cells,def.id)){ctx.toast('Корабль здесь не помещается');return;}p.ships=p.ships.filter(s=>s.id!==def.id);p.ships.push({...def,cells,hits:[]});state.selected=nextUnplaced(p);save();renderSetup();}
    function randomFleet(){const p=state.players[state.placementPlayer];p.ships=[];for(const def of FLEET){let ok=false;for(let a=0;a<1500&&!ok;a++){const o=Math.random()<.5?'h':'v',r=Math.floor(Math.random()*N),c=Math.floor(Math.random()*N),cells=cellsFor(r,c,def.size,o);if(valid(p,cells)){p.ships.push({...def,cells,hits:[]});ok=true;}}if(!ok){randomFleet();return;}}state.selected=null;save();renderSetup();}
    function clearFleet(){state.players[state.placementPlayer].ships=[];state.selected=FLEET[0].id;save();renderSetup();}
    function ready(){const p=state.players[state.placementPlayer];if(p.ships.length!==FLEET.length)return;if(state.placementPlayer===0){state.placementPlayer=1;state.selected=FLEET[0].id;state.orientation='h';state.phase='passSetup';}else{state.current=0;state.phase='passBattle';}save();render();}
    function continuePass(){state.phase=state.phase==='passSetup'?'setup':'battle';save();render();}
    function shotClass(attacker,defender,r,c,reveal=false){const v=attacker.shots[r][c];if(v===1)return'miss';if(v===2){const s=shipAt(defender,r,c);return`hit ${s&&sunk(s)?'sunk':''}`;}if(reveal&&grid(defender)[r][c])return'ship';return'';}
    function markPerimeter(attacker,ship){ship.cells.forEach(([r,c])=>{for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const nr=r+dr,nc=c+dc;if(nr>=0&&nr<N&&nc>=0&&nc<N&&attacker.shots[nr][nc]===0)attacker.shots[nr][nc]=1;}});}
    function fire(r,c){if(state.phase!=='battle')return;const a=state.players[state.current],d=state.players[1-state.current];if(a.shots[r][c]){ctx.toast('Сюда уже стреляли');return;}const ship=shipAt(d,r,c);if(ship){a.shots[r][c]=2;ship.hits=ship.hits||[];if(!ship.hits.some(([x,y])=>x===r&&y===c))ship.hits.push([r,c]);if(sunk(ship)){markPerimeter(a,ship);state.lastResult=`Потоплен: ${ship.name}`;}else state.lastResult='Попадание';}else{a.shots[r][c]=1;state.lastResult='Мимо';}
      if(alive(d)===0){state.phase='finished';state.winner=state.current;state.stats.games=(state.stats.games||0)+1;state.stats.wins[state.current]=(state.stats.wins[state.current]||0)+1;}else state.phase='shotResult';save();render();}
    function finishTurn(){state.current=1-state.current;state.phase='passBattle';state.lastResult='';save();render();}
    function newMatch(){const stats=state.stats||{wins:[0,0],games:0};state=fresh(ctx.settings(),stats);save();ctx.closeModal();render();}
    function askNew(){const card=ctx.showModal(`<div class="modal-icon">↻</div><h2>Новая партия?</h2><p>Текущая расстановка и все сделанные выстрелы будут удалены.</p><div class="button-row"><button id="bsNo" class="secondary">Отмена</button><button id="bsYes" class="danger">Начать заново</button></div>`);card.querySelector('#bsNo').addEventListener('click',ctx.closeModal);card.querySelector('#bsYes').addEventListener('click',newMatch);}
    function boardHtml(classes,attrs=''){return`<div class="bs-board" ${attrs}>${Array.from({length:N*N},(_,i)=>{const r=Math.floor(i/N),c=i%N;return`<button class="bs-cell ${classes(r,c)}" data-r="${r}" data-c="${c}" type="button"></button>`;}).join('')}</div>`;}
    function bindBoard(handler,root=ctx.root){root.querySelectorAll('.bs-cell').forEach(b=>b.addEventListener('click',()=>handler(Number(b.dataset.r),Number(b.dataset.c))));}

    function renderSetup(){const p=state.players[state.placementPlayer],g=grid(p),complete=p.ships.length===FLEET.length;ctx.root.innerHTML=`<div class="game-shell"><div class="game-toolbar"><div class="game-status"><strong>${p.name}: расстановка</strong><span>${p.ships.length} из ${FLEET.length} кораблей</span></div><div class="toolbar-actions"><button id="bsRotate" class="small-button">${state.orientation==='h'?'↻ Повернуть':'↻ Вертикально'}</button><button id="bsNew" class="small-button">Заново</button></div></div><div class="bs-layout"><div class="bs-fleet">${FLEET.map(d=>{const placed=p.ships.some(s=>s.id===d.id);return`<button class="bs-ship ${state.selected===d.id?'active':''} ${placed?'placed':''}" data-ship="${d.id}">${d.name} · ${d.size}</button>`;}).join('')}</div><div class="bs-board-wrap">${boardHtml((r,c)=>g[r][c]?'ship':'')}</div><div class="bs-actionbar"><button id="bsRandom" class="secondary">Случайно</button><button id="bsClear" class="secondary">Очистить</button><button id="bsReady" class="primary" ${complete?'':'disabled'}>Готово</button></div></div></div>`;
      bindBoard(place);ctx.root.querySelectorAll('[data-ship]').forEach(b=>b.addEventListener('click',()=>{state.selected=b.dataset.ship;save();renderSetup();}));ctx.root.querySelector('#bsRotate').addEventListener('click',()=>{state.orientation=state.orientation==='h'?'v':'h';save();renderSetup();});ctx.root.querySelector('#bsRandom').addEventListener('click',randomFleet);ctx.root.querySelector('#bsClear').addEventListener('click',clearFleet);ctx.root.querySelector('#bsReady').addEventListener('click',ready);ctx.root.querySelector('#bsNew').addEventListener('click',askNew);
    }
    function renderPass(){const next=state.phase==='passSetup'?state.players[1]:state.players[state.current];ctx.root.innerHTML=`<div class="game-shell"><div class="game-stage"><div class="modal-card"><div class="modal-icon">🙈</div><div class="eyebrow">Экран скрыт</div><h2>Передайте устройство</h2><p><strong>${next.name}</strong>, нажмите кнопку, когда второй игрок отвернется.</p><button id="bsContinue" class="primary full">${state.phase==='passSetup'?'Расставить мой флот':'Начать мой ход'}</button></div></div></div>`;ctx.root.querySelector('#bsContinue').addEventListener('click',continuePass);}
    function showOwn(){const p=state.players[state.current],enemy=state.players[1-state.current];let card=ctx.showModal(`<div class="modal-icon">🔒</div><h2>Поле игрока ${p.name}</h2><p>Убедитесь, что соперник не смотрит на экран.</p><div class="button-row"><button id="ownCancel" class="secondary">Отмена</button><button id="ownReveal" class="primary">Показать поле</button></div>`);card.querySelector('#ownCancel').addEventListener('click',ctx.closeModal);card.querySelector('#ownReveal').addEventListener('click',()=>{card=ctx.showModal(`<div class="own-board-modal"><h2>Ваш флот</h2><p>Кораблей осталось: ${alive(p)}</p>${boardHtml((r,c)=>shotClass(enemy,p,r,c,true))}<button id="ownClose" class="primary full" style="margin-top:14px">Скрыть поле</button></div>`,'own-board-modal');card.querySelector('#ownClose').addEventListener('click',ctx.closeModal);});}
    function renderBattle(){const a=state.players[state.current],d=state.players[1-state.current],locked=state.phase==='shotResult';ctx.root.innerHTML=`<div class="game-shell"><div class="game-toolbar"><div class="game-status"><strong>${locked?state.lastResult:`Ходит ${a.name}`}</strong><span>${locked?'Результат выстрела можно показать обоим':`У соперника ${alive(d)} кораблей`}</span></div><div class="toolbar-actions"><button id="bsOwn" class="small-button">Мое поле</button><button id="bsNew" class="small-button">Заново</button></div></div><div class="bs-layout"><div class="bs-board-wrap">${boardHtml((r,c)=>`${shotClass(a,d,r,c,false)} ${a.shots[r][c]||locked?'disabled':''}`)}</div>${locked?'<button id="bsEndTurn" class="primary full">Передать ход</button>':'<div class="panel" style="padding:10px 14px;text-align:center"><span class="muted">Это поле ваших выстрелов — его не страшно видеть обоим игрокам</span></div>'}</div></div>`;if(!locked)bindBoard(fire);ctx.root.querySelector('#bsOwn').addEventListener('click',showOwn);ctx.root.querySelector('#bsNew').addEventListener('click',askNew);ctx.root.querySelector('#bsEndTurn')?.addEventListener('click',finishTurn);}
    function renderFinished(){const w=state.players[state.winner],l=state.players[1-state.winner];ctx.root.innerHTML=`<div class="game-shell"><div class="game-stage"><div class="modal-card"><div class="modal-icon">🏆</div><div class="eyebrow">Партия окончена</div><h2>${w.name} победил!</h2><p>Все корабли игрока ${l.name} уничтожены.</p><button id="bsAgain" class="primary full">Сыграть еще раз</button></div></div></div>`;ctx.root.querySelector('#bsAgain').addEventListener('click',newMatch);}
    function render(){if(state.phase==='setup')renderSetup();else if(state.phase==='passSetup'||state.phase==='passBattle')renderPass();else if(state.phase==='battle'||state.phase==='shotResult')renderBattle();else renderFinished();}
    render();
  },
  getStats(state,settings){const s=state?.stats||{wins:[0,0],games:0};return{value:s.games||0,label:(s.games||0)?`${settings.player1} ${s.wins?.[0]||0}:${s.wins?.[1]||0} ${settings.player2}`:'партий пока нет'};}
};
