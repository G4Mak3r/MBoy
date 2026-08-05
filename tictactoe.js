export const tictactoe = {
  id: 'tictactoe',
  title: 'Крестики-нолики',
  icon: '✕○',
  players: 2,
  duration: '1–3 минуты',
  description: 'Быстрые партии на одном открытом поле.',
  mount(ctx) {
    const names = ctx.settings();
    let state = ctx.storage.read({ board: Array(9).fill(''), turn: 'X', scoreX: 0, scoreO: 0, draws: 0, winner: null, winning: [] });
    if (!Array.isArray(state.board) || state.board.length !== 9) state = { board: Array(9).fill(''), turn: 'X', scoreX: 0, scoreO: 0, draws: 0, winner: null, winning: [] };

    function check(board) {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const line of lines) {
        const [a,b,c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line };
      }
      return board.every(Boolean) ? { winner: 'draw', line: [] } : null;
    }

    function newRound() {
      state.board = Array(9).fill(''); state.turn = state.turn === 'X' ? 'O' : 'X'; state.winner = null; state.winning = [];
      save(); render();
    }
    function save() { ctx.storage.write(state); }
    function play(index) {
      if (state.board[index] || state.winner) return;
      state.board[index] = state.turn;
      const result = check(state.board);
      if (result) {
        state.winner = result.winner; state.winning = result.line;
        if (result.winner === 'X') state.scoreX++;
        else if (result.winner === 'O') state.scoreO++;
        else state.draws++;
      } else state.turn = state.turn === 'X' ? 'O' : 'X';
      save(); render();
    }
    function render() {
      const currentName = state.turn === 'X' ? names.player1 : names.player2;
      const status = state.winner === 'draw' ? 'Ничья' : state.winner ? `${state.winner === 'X' ? names.player1 : names.player2} победил` : `Ходит ${currentName}`;
      ctx.root.innerHTML = `<div class="game-shell"><div class="game-toolbar"><div class="game-status"><strong>${status}</strong><span>${state.winner ? 'Начните следующий раунд' : `Фишка ${state.turn}`}</span></div><button id="tttNew" class="small-button">Новый раунд</button></div><div class="game-stage"><div class="ttt-wrap"><div class="ttt-score"><div><small>${names.player1} · X</small><strong>${state.scoreX}</strong></div><div><small>Ничьи</small><strong>${state.draws}</strong></div><div><small>${names.player2} · O</small><strong>${state.scoreO}</strong></div></div><div class="ttt-board">${state.board.map((v,i)=>`<button class="ttt-cell ${v.toLowerCase()} ${state.winning.includes(i)?'win':''}" data-i="${i}">${v}</button>`).join('')}</div>${state.winner ? '<button id="tttAgain" class="primary full">Следующий раунд</button>' : ''}</div></div></div>`;
      ctx.root.querySelectorAll('[data-i]').forEach(btn => btn.addEventListener('click', () => play(Number(btn.dataset.i))));
      ctx.root.querySelector('#tttNew').addEventListener('click', newRound);
      ctx.root.querySelector('#tttAgain')?.addEventListener('click', newRound);
    }
    render();
  },
  getStats(state, settings) {
    const s = state || {};
    const total = (s.scoreX || 0) + (s.scoreO || 0) + (s.draws || 0);
    return { value: total, label: total ? `партий; ${settings.player1} ${s.scoreX||0}:${s.scoreO||0} ${settings.player2}` : 'партий пока нет' };
  }
};
