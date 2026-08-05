export const minesweeper = {
  id: 'minesweeper', title: 'Сапер', icon: '💣', players: 1, duration: '3–15 минут', description: 'Открывайте клетки и отмечайте мины флажками.',
  mount(ctx) {
    const SIZE=9, MINES=10;
    let state=ctx.storage.read(null)||fresh();
    let timer=null;
    function fresh(){return{cells:Array.from({length:SIZE*SIZE},()=>({mine:false,open:false,flag:false,n:0})),generated:false,status:'playing',mode:'open',seconds:0,wins:0,best:null};}
    function save(){ctx.storage.write(state);}
    function neighbors(i){const r=Math.floor(i/SIZE),c=i%SIZE,out=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const nr=r+dr,nc=c+dc;if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE)out.push(nr*SIZE+nc);}return out;}
    function generate(safe){const blocked=new Set([safe,...neighbors(safe)]);let placed=0;while(placed<MINES){const i=Math.floor(Math.random()*SIZE*SIZE);if(blocked.has(i)||state.cells[i].mine)continue;state.cells[i].mine=true;placed++;}state.cells.forEach((cell,i)=>cell.n=neighbors(i).filter(n=>state.cells[n].mine).length);state.generated=true;}
    function reveal(i){const cell=state.cells[i];if(cell.open||cell.flag||state.status!=='playing')return;if(!state.generated)generate(i);cell.open=true;if(cell.mine){state.status='lost';state.cells.forEach(c=>{if(c.mine)c.open=true;});stopTimer();ctx.toast('Мина!');}
      else if(cell.n===0){neighbors(i).forEach(reveal);}checkWin();save();render();}
    function flag(i){const cell=state.cells[i];if(cell.open||state.status!=='playing')return;cell.flag=!cell.flag;save();render();}
    function act(i){state.mode==='flag'?flag(i):reveal(i);}
    function checkWin(){if(state.status==='playing'&&state.cells.filter(c=>!c.mine).every(c=>c.open)){state.status='won';state.wins=(state.wins||0)+1;state.best=state.best==null?state.seconds:Math.min(state.best,state.seconds);stopTimer();ctx.toast('Поле разминировано!');}}
    function startTimer(){if(timer||state.status!=='playing')return;timer=setInterval(()=>{state.seconds++;save();const el=ctx.root.querySelector('#msTime');if(el)el.textContent=`${state.seconds} с`;},1000);}
    function stopTimer(){clearInterval(timer);timer=null;}
    function restart(){const meta={wins:state.wins||0,best:state.best};state=fresh();Object.assign(state,meta);save();startTimer();render();}
    function render(){const flags=state.cells.filter(c=>c.flag).length;ctx.root.innerHTML=`<div class="game-shell"><div class="game-toolbar"><div class="game-status"><strong>${state.status==='won'?'Победа':state.status==='lost'?'Игра окончена':'Найдите 10 мин'}</strong><span id="msTime">${state.seconds} с</span></div><button id="msNew" class="small-button">Новое поле</button></div><div class="game-stage"><div class="ms-wrap"><div class="ms-controls"><div class="score-box"><small>Флаги</small><strong>${flags}/${MINES}</strong></div><button id="modeOpen" class="small-button ${state.mode==='open'?'mode-active':''}">Открывать</button><button id="modeFlag" class="small-button ${state.mode==='flag'?'mode-active':''}">🚩 Флаг</button></div><div class="ms-board">${state.cells.map((c,i)=>`<button class="ms-cell ${c.open?'open':''} ${c.flag?'flag':''} ${c.open&&c.mine?'mine':''} n${c.n}" data-i="${i}">${c.flag&&!c.open?'🚩':c.open?(c.mine?'💣':c.n||''):''}</button>`).join('')}</div></div></div></div>`;ctx.root.querySelector('#msNew').addEventListener('click',restart);ctx.root.querySelector('#modeOpen').addEventListener('click',()=>{state.mode='open';save();render();});ctx.root.querySelector('#modeFlag').addEventListener('click',()=>{state.mode='flag';save();render();});ctx.root.querySelectorAll('[data-i]').forEach(b=>{b.addEventListener('click',()=>{startTimer();act(Number(b.dataset.i));});b.addEventListener('contextmenu',e=>{e.preventDefault();flag(Number(b.dataset.i));});});}
    startTimer();render();return()=>stopTimer();
  },
  getStats(state){return{value:state?.wins||0,label:state?.best!=null?`побед; рекорд ${state.best} с`:'побед'};}
};
