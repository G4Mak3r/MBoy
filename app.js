(() => {
  "use strict";

  const BOARD_SIZE = 10;
  const FLEET = [
    { id: "battleship", name: "Линкор", size: 4 },
    { id: "cruiser1", name: "Крейсер", size: 3 },
    { id: "cruiser2", name: "Крейсер", size: 3 },
    { id: "destroyer1", name: "Эсминец", size: 2 },
    { id: "destroyer2", name: "Эсминец", size: 2 },
    { id: "destroyer3", name: "Эсминец", size: 2 },
    { id: "boat1", name: "Катер", size: 1 },
    { id: "boat2", name: "Катер", size: 1 },
    { id: "boat3", name: "Катер", size: 1 },
    { id: "boat4", name: "Катер", size: 1 }
  ];

  const $ = (id) => document.getElementById(id);

  const els = {
    screens: [...document.querySelectorAll(".screen")],
    start: $("screenStart"),
    placement: $("screenPlacement"),
    pass: $("screenPass"),
    battle: $("screenBattle"),
    result: $("screenResult"),
    player1Name: $("player1Name"),
    player2Name: $("player2Name"),
    startBtn: $("startBtn"),
    newGameBtn: $("newGameBtn"),
    placementPlayerLabel: $("placementPlayerLabel"),
    placementCount: $("placementCount"),
    placementInstruction: $("placementInstruction"),
    placementBoard: $("placementBoard"),
    fleetPicker: $("fleetPicker"),
    rotateBtn: $("rotateBtn"),
    randomizeBtn: $("randomizeBtn"),
    clearPlacementBtn: $("clearPlacementBtn"),
    confirmPlacementBtn: $("confirmPlacementBtn"),
    passEyebrow: $("passEyebrow"),
    passTitle: $("passTitle"),
    passText: $("passText"),
    continueBtn: $("continueBtn"),
    turnLabel: $("turnLabel"),
    battleTitle: $("battleTitle"),
    enemyShipsLeft: $("enemyShipsLeft"),
    enemyBoard: $("enemyBoard"),
    ownBoard: $("ownBoard"),
    winnerTitle: $("winnerTitle"),
    winnerText: $("winnerText"),
    playAgainBtn: $("playAgainBtn"),
    toast: $("toast"),
    confirmDialog: $("confirmDialog")
  };

  let state = freshState();
  let toastTimer = null;

  function emptyGrid() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
  }

  function freshPlayer(name) {
    return {
      name,
      grid: emptyGrid(),
      shots: emptyGrid(),
      ships: []
    };
  }

  function freshState() {
    return {
      phase: "start",
      players: [freshPlayer("Игрок 1"), freshPlayer("Игрок 2")],
      placementPlayer: 0,
      currentPlayer: 0,
      selectedShipId: FLEET[0].id,
      orientation: "horizontal",
      passReason: null,
      shotLocked: false
    };
  }

  function showScreen(id) {
    els.screens.forEach((screen) => screen.classList.toggle("active", screen.id === id));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function save() {
    localStorage.setItem("morskoi-boi-state-v1", JSON.stringify(state));
  }

  function load() {
    try {
      const raw = localStorage.getItem("morskoi-boi-state-v1");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.players || parsed.players.length !== 2) return false;
      state = parsed;
      state.shotLocked = false;
      return true;
    } catch {
      return false;
    }
  }

  function resetGame() {
    localStorage.removeItem("morskoi-boi-state-v1");
    state = freshState();
    els.player1Name.value = "Игрок 1";
    els.player2Name.value = "Игрок 2";
    showScreen("screenStart");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1900);
  }

  function cellKey(r, c) {
    return `${r}:${c}`;
  }

  function createBoard(container, clickHandler, cellClasser) {
    container.innerHTML = "";
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `cell ${cellClasser ? cellClasser(r, c) : ""}`.trim();
        button.dataset.row = r;
        button.dataset.col = c;
        button.setAttribute("aria-label", `Строка ${r + 1}, столбец ${c + 1}`);
        if (clickHandler) button.addEventListener("click", () => clickHandler(r, c));
        container.appendChild(button);
      }
    }
  }

  function getSelectedShip() {
    return FLEET.find((ship) => ship.id === state.selectedShipId) || null;
  }

  function occupiedCellsFor(player, shipId = null) {
    const set = new Set();
    player.ships.forEach((ship) => {
      if (ship.id !== shipId) ship.cells.forEach(([r, c]) => set.add(cellKey(r, c)));
    });
    return set;
  }

  function candidateCells(row, col, size, orientation) {
    const cells = [];
    for (let i = 0; i < size; i++) {
      cells.push(orientation === "horizontal" ? [row, col + i] : [row + i, col]);
    }
    return cells;
  }

  function isPlacementValid(player, cells, ignoreShipId = null) {
    const occupied = occupiedCellsFor(player, ignoreShipId);

    for (const [r, c] of cells) {
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
      if (occupied.has(cellKey(r, c))) return false;

      // Корабли не могут соприкасаться даже по диагонали.
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (occupied.has(cellKey(r + dr, c + dc))) return false;
        }
      }
    }
    return true;
  }

  function placeShip(row, col) {
    const player = state.players[state.placementPlayer];
    const selected = getSelectedShip();
    if (!selected) return;

    const cells = candidateCells(row, col, selected.size, state.orientation);
    if (!isPlacementValid(player, cells, selected.id)) {
      showToast("Здесь корабль поставить нельзя");
      return;
    }

    player.ships = player.ships.filter((ship) => ship.id !== selected.id);
    player.ships.push({
      id: selected.id,
      name: selected.name,
      size: selected.size,
      cells,
      hits: []
    });

    rebuildGrid(player);
    selectNextUnplacedShip();
    renderPlacement();
    save();
  }

  function rebuildGrid(player) {
    player.grid = emptyGrid();
    player.ships.forEach((ship, index) => {
      ship.cells.forEach(([r, c]) => {
        player.grid[r][c] = index + 1;
      });
    });
  }

  function selectNextUnplacedShip() {
    const player = state.players[state.placementPlayer];
    const next = FLEET.find((f) => !player.ships.some((s) => s.id === f.id));
    state.selectedShipId = next ? next.id : null;
  }

  function renderFleetPicker() {
    const player = state.players[state.placementPlayer];
    els.fleetPicker.innerHTML = "";

    FLEET.forEach((ship) => {
      const placed = player.ships.some((s) => s.id === ship.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `ship-choice ${state.selectedShipId === ship.id ? "active" : ""} ${placed ? "placed" : ""}`.trim();

      const dots = Array.from({ length: ship.size }, () => '<span class="ship-dot"></span>').join("");
      button.innerHTML = `<span>${ship.name}</span><span class="ship-dots">${dots}</span>`;
      button.addEventListener("click", () => {
        state.selectedShipId = ship.id;
        renderPlacement();
      });
      els.fleetPicker.appendChild(button);
    });
  }

  function renderPlacement() {
    const player = state.players[state.placementPlayer];
    els.placementPlayerLabel.textContent = player.name;
    els.placementCount.textContent = `${player.ships.length} / ${FLEET.length}`;
    els.placementInstruction.textContent = state.selectedShipId
      ? `Поставьте: ${getSelectedShip().name.toLowerCase()} (${getSelectedShip().size})`
      : "Все корабли расставлены";
    els.confirmPlacementBtn.disabled = player.ships.length !== FLEET.length;

    createBoard(
      els.placementBoard,
      placeShip,
      (r, c) => player.grid[r][c] ? "ship" : ""
    );

    renderFleetPicker();
    showScreen("screenPlacement");
  }

  function randomizeFleet() {
    const player = state.players[state.placementPlayer];
    player.ships = [];
    player.grid = emptyGrid();

    for (const def of FLEET) {
      let placed = false;
      for (let attempt = 0; attempt < 2000 && !placed; attempt++) {
        const orientation = Math.random() < .5 ? "horizontal" : "vertical";
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        const cells = candidateCells(row, col, def.size, orientation);

        if (isPlacementValid(player, cells)) {
          player.ships.push({
            id: def.id,
            name: def.name,
            size: def.size,
            cells,
            hits: []
          });
          placed = true;
        }
      }

      if (!placed) {
        randomizeFleet();
        return;
      }
    }

    rebuildGrid(player);
    state.selectedShipId = null;
    renderPlacement();
    save();
  }

  function startNewMatch() {
    const p1 = els.player1Name.value.trim() || "Игрок 1";
    const p2 = els.player2Name.value.trim() || "Игрок 2";
    state = freshState();
    state.players[0].name = p1;
    state.players[1].name = p2;
    state.phase = "placement";
    save();
    renderPlacement();
  }

  function confirmPlacement() {
    const player = state.players[state.placementPlayer];
    if (player.ships.length !== FLEET.length) return;

    if (state.placementPlayer === 0) {
      state.placementPlayer = 1;
      state.selectedShipId = FLEET[0].id;
      state.orientation = "horizontal";
      state.phase = "pass-placement";
      state.passReason = "placement";
      save();
      renderPass();
    } else {
      state.currentPlayer = 0;
      state.phase = "pass-battle";
      state.passReason = "battle-start";
      save();
      renderPass();
    }
  }

  function renderPass() {
    if (state.passReason === "placement") {
      const next = state.players[1];
      els.passEyebrow.textContent = "Флот первого игрока скрыт";
      els.passTitle.textContent = `Передайте iPad: ${next.name}`;
      els.passText.textContent = `${next.name}, нажмите кнопку и расставьте свой флот.`;
      els.continueBtn.textContent = "Начать расстановку";
    } else {
      const next = state.players[state.currentPlayer];
      els.passEyebrow.textContent = "Поле скрыто";
      els.passTitle.textContent = `Передайте iPad: ${next.name}`;
      els.passText.textContent = `${next.name}, убедитесь, что соперник не смотрит на экран.`;
      els.continueBtn.textContent = state.passReason === "battle-start" ? "Начать бой" : "Мой ход";
    }
    showScreen("screenPass");
  }

  function continueAfterPass() {
    if (state.passReason === "placement") {
      state.phase = "placement";
      renderPlacement();
      save();
      return;
    }

    state.phase = "battle";
    state.shotLocked = false;
    renderBattle();
    save();
  }

  function shipsAlive(player) {
    return player.ships.filter((ship) => ship.hits.length < ship.size).length;
  }

  function findShipAt(player, row, col) {
    return player.ships.find((ship) => ship.cells.some(([r, c]) => r === row && c === col)) || null;
  }

  function shipIsSunk(ship) {
    return ship.hits.length >= ship.size;
  }

  function shotClass(attacker, defender, r, c, revealOwn) {
    const shot = attacker.shots[r][c];
    if (shot === 2) {
      const ship = findShipAt(defender, r, c);
      return ship && shipIsSunk(ship) ? "hit sunk" : "hit";
    }
    if (shot === 1) return "miss";
    if (revealOwn && defender.grid[r][c]) return "ship";
    return "";
  }

  function renderBattle() {
    const attacker = state.players[state.currentPlayer];
    const defender = state.players[1 - state.currentPlayer];

    els.turnLabel.textContent = `Ход: ${attacker.name}`;
    els.battleTitle.textContent = "Выберите цель";
    els.enemyShipsLeft.textContent = `Кораблей: ${shipsAlive(defender)}`;

    createBoard(
      els.enemyBoard,
      fireAt,
      (r, c) => {
        const cls = shotClass(attacker, defender, r, c, false);
        return `${cls} ${attacker.shots[r][c] ? "disabled" : ""}`.trim();
      }
    );

    createBoard(
      els.ownBoard,
      null,
      (r, c) => shotClass(defender, attacker, r, c, true)
    );

    showScreen("screenBattle");
  }

  function markSunkPerimeter(attacker, ship) {
    ship.cells.forEach(([r, c]) => {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && attacker.shots[nr][nc] === 0) {
            attacker.shots[nr][nc] = 1;
          }
        }
      }
    });
  }

  function fireAt(row, col) {
    if (state.shotLocked) return;

    const attacker = state.players[state.currentPlayer];
    const defender = state.players[1 - state.currentPlayer];

    if (attacker.shots[row][col] !== 0) {
      showToast("По этой клетке уже стреляли");
      return;
    }

    state.shotLocked = true;
    const ship = findShipAt(defender, row, col);

    if (ship) {
      attacker.shots[row][col] = 2;
      if (!ship.hits.some(([r, c]) => r === row && c === col)) ship.hits.push([row, col]);

      if (shipIsSunk(ship)) {
        markSunkPerimeter(attacker, ship);
        showToast(`Корабль потоплен: ${ship.name}`);
      } else {
        showToast("Попадание!");
      }

      save();
      renderBattle();

      if (shipsAlive(defender) === 0) {
        setTimeout(() => finishGame(attacker, defender), 700);
        return;
      }

      // По классическим правилам после попадания игрок стреляет еще раз.
      setTimeout(() => {
        state.shotLocked = false;
        renderBattle();
      }, 520);
    } else {
      attacker.shots[row][col] = 1;
      showToast("Мимо");
      save();
      renderBattle();

      setTimeout(() => {
        state.currentPlayer = 1 - state.currentPlayer;
        state.phase = "pass-battle";
        state.passReason = "turn";
        state.shotLocked = false;
        save();
        renderPass();
      }, 700);
    }
  }

  function finishGame(winner, loser) {
    state.phase = "result";
    state.winner = winner.name;
    save();
    els.winnerTitle.textContent = `${winner.name} победил!`;
    els.winnerText.textContent = `Все корабли игрока ${loser.name} уничтожены.`;
    showScreen("screenResult");
  }

  function resumeFromState() {
    switch (state.phase) {
      case "placement":
        renderPlacement();
        break;
      case "pass-placement":
      case "pass-battle":
        renderPass();
        break;
      case "battle":
        renderBattle();
        break;
      case "result": {
        const winner = state.winner || state.players[state.currentPlayer].name;
        els.winnerTitle.textContent = `${winner} победил!`;
        els.winnerText.textContent = "Партия завершена.";
        showScreen("screenResult");
        break;
      }
      default:
        els.player1Name.value = state.players?.[0]?.name || "Игрок 1";
        els.player2Name.value = state.players?.[1]?.name || "Игрок 2";
        showScreen("screenStart");
    }
  }

  els.startBtn.addEventListener("click", startNewMatch);
  els.rotateBtn.addEventListener("click", () => {
    state.orientation = state.orientation === "horizontal" ? "vertical" : "horizontal";
    els.rotateBtn.textContent = state.orientation === "horizontal" ? "↻ Повернуть" : "↻ Вертикально";
    showToast(state.orientation === "horizontal" ? "Горизонтально" : "Вертикально");
    save();
  });
  els.randomizeBtn.addEventListener("click", randomizeFleet);
  els.clearPlacementBtn.addEventListener("click", () => {
    const player = state.players[state.placementPlayer];
    player.ships = [];
    player.grid = emptyGrid();
    state.selectedShipId = FLEET[0].id;
    renderPlacement();
    save();
  });
  els.confirmPlacementBtn.addEventListener("click", confirmPlacement);
  els.continueBtn.addEventListener("click", continueAfterPass);
  els.playAgainBtn.addEventListener("click", resetGame);

  els.newGameBtn.addEventListener("click", () => {
    if (state.phase === "start") return;
    if (typeof els.confirmDialog.showModal === "function") {
      els.confirmDialog.showModal();
    } else if (confirm("Начать новую игру? Текущая партия будет удалена.")) {
      resetGame();
    }
  });

  els.confirmDialog.addEventListener("close", () => {
    if (els.confirmDialog.returnValue === "confirm") resetGame();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.phase === "battle") save();
  });

  if (load()) {
    els.player1Name.value = state.players[0].name;
    els.player2Name.value = state.players[1].name;
    resumeFromState();
  } else {
    showScreen("screenStart");
  }
})();
