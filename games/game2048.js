export const game2048 = {
  id: '2048', title: '2048', icon: '2048', players: 1, duration: '5–30 минут', description: 'Складывайте одинаковые числа свайпами.',
  mount(ctx) {
    let state = ctx.storage.read(null) || { board: Array(16).fill(0), score: 0, best: 0, won: false, over: false };
    if (!state.board?.some(Boolean)) { spawn(); spawn(); save(); }
    let startX = 0, startY = 0;

    function spawn() {
      const empty = state.board.map((v,i)=>v?null:i).filter(v=>v!==null);
      if (!empty.length) return;
      state.board[empty[Math.floor(Math.random()*empty.length)]] = Math.random() < .9 ? 2 : 4;
    }
    function compress(line) {
      const values = line.filter(Boolean); const out = []; let gained = 0;
      for (let i=0;i<values.length;i++) {
        if (values[i] === values[i+1]) { const n = values[i]*2; out.push(n); gained += n; i++; }
        else out.push(values[i]);
      }
      while (out.length<4) out.push(0);
      return { line: out, gained };
    }
    function canMove() {
      if (state.board.some(v=>!v)) return true;
      for (let r=0;r<4;r++) for (let c=0;c<4;c++) {
        const v=state.board[r*4+c];
        if (c<3 && v===state.board[r*4+c+1]) return true;
        if (r<3 && v===state.board[(r+1)*4+c]) return true;
      }
      return false;
    }
    function move(direction) {
      if (state.over) return;
      const before = state.board.join(','); const next = Array(16).fill(0); let gained=0;
      for (let i=0;i<4;i++) {
        let line=[];
        if (direction==='left'||direction==='right') for(let c=0;c<4;c++) line.push(state.board[i*4+c]);
        else for(let r=0;r<4;r++) line.push(state.board[r*4+i]);
        if (direction==='right'||direction==='down') line.reverse();
        const result=compress(line); line=result.line; gained+=result.gained;
        if (direction==='right'||direction==='down') line.reverse();
        if (direction==='left'||direction==='right') for(let c=0;c<4;c++) next[i*4+c]=line[c];
        else for(let r=0;r<4;r++) next[r*4+i]=line[r];
      }
      state.board=next;
      if (before === state.board.join(',')) return;
      state.score += gained; state.best=Math.max(state.best,state.score); spawn();
      if (state.board.includes(2048)) state.won=true;
      state.over=!canMove(); save(); render();
      if (state.over) ctx.toast('Ходов больше нет');
    }
    function restart() { state={board:Array(16).fill(0),score:0,best:state.best||0,won:false,over:false}; spawn();spawn();save();render(); }
    function save(){ctx.storage.write(state);}
    function render(){
      ctx.root.innerHTML=`<div class="game-shell"><div class="game-toolbar"><div class="game-status"><strong>${state.over?'Игра окончена':state.won?'Плитка 2048 собрана!':'Соединяйте числа'}</strong><span>Свайпните по полю или используйте стрелки</span></div><button id="gNew" class="small-button">Заново</button></div><div class="game-stage"><div class="g2048-wrap"><div class="g2048-top"><div></div><div class="score-box"><small>Счет</small><strong>${state.score}</strong></div><div class="score-box"><small>Рекорд</small><strong>${state.best}</strong></div></div><div id="gBoard" class="g2048-board">${state.board.map(v=>`<div class="tile" data-v="${v||''}">${v||''}</div>`).join('')}</div><div class="arrow-pad"><button class="up" data-m="up">▲</button><button class="left" data-m="left">◀</button><button data-m="down">▼</button><button data-m="right">▶</button></div></div></div></div>`;
      ctx.root.querySelector('#gNew').addEventListener('click',restart);
      ctx.root.querySelectorAll('[data-m]').forEach(b=>b.addEventListener('click',()=>move(b.dataset.m)));
      const board=ctx.root.querySelector('#gBoard');
      board.addEventListener('pointerdown',e=>{startX=e.clientX;startY=e.clientY;});
      board.addEventListener('pointerup',e=>{const dx=e.clientX-startX,dy=e.clientY-startY;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));});
    }
    render();
  },
  getStats(state){ return { value: state?.best || 0, label: 'лучший счет' }; }
};
