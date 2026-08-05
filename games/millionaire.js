const NICHES = {
  beauty: {
    name: 'Косметика и парфюмерия', icon: '🧴', buyCost: 430, retail: 1190, baseDemand: 74,
    returnRate: .09, declarationCost: 135000, declarationWeeks: 3, marked: true,
    rawCost: 175, productionCost: 95, defectRisk: .12, storage: 1
  },
  apparel: {
    name: 'Одежда и аксессуары', icon: '👕', buyCost: 920, retail: 2490, baseDemand: 52,
    returnRate: .24, declarationCost: 95000, declarationWeeks: 2, marked: true,
    rawCost: 410, productionCost: 260, defectRisk: .09, storage: 1.5
  },
  home: {
    name: 'Товары для дома', icon: '🏠', buyCost: 610, retail: 1690, baseDemand: 61,
    returnRate: .08, declarationCost: 78000, declarationWeeks: 2, marked: false,
    rawCost: 270, productionCost: 170, defectRisk: .07, storage: 2
  },
  electronics: {
    name: 'Электроника и гаджеты', icon: '🎧', buyCost: 1850, retail: 3990, baseDemand: 38,
    returnRate: .14, declarationCost: 165000, declarationWeeks: 4, marked: false,
    rawCost: 980, productionCost: 480, defectRisk: .15, storage: 1
  }
};

const ROUTES = {
  resale: {
    name: 'Перепродажа', icon: '📦', description: 'Быстрый старт: закупаете готовый товар и продаете дороже.',
    cash: 260000, debt: 0, inventory: 90, raw: 0, workshop: false, equipment: 0,
    marketplace: true, messenger: true, reputation: 16, risk: 10
  },
  brand: {
    name: 'Свой бренд', icon: '🏷️', description: 'Контрактные партии, упаковка и постепенное строительство бренда.',
    cash: 330000, debt: 120000, inventory: 45, raw: 0, workshop: false, equipment: 0,
    marketplace: true, messenger: true, reputation: 22, risk: 14
  },
  production: {
    name: 'Производство', icon: '🏭', description: 'Высокая маржа, но аренда, документы, оборудование и персонал.',
    cash: 460000, debt: 280000, inventory: 0, raw: 80, workshop: true, equipment: 1,
    marketplace: false, messenger: true, reputation: 12, risk: 20
  }
};

const CHANNELS = {
  marketplace: { name: 'Маркетплейсы', icon: '🛒', commission: .31, logistics: 105, delay: 1, weight: 1.35 },
  messenger: { name: 'Мессенджеры', icon: '💬', commission: .025, logistics: 75, delay: 0, weight: .45 },
  store: { name: 'Интернет-магазин', icon: '🌐', commission: .055, logistics: 90, delay: 0, weight: .75 },
  wholesale: { name: 'Опт и B2B', icon: '🤝', commission: .02, logistics: 35, delay: 1, weight: .65 }
};

const STAFF = {
  packer: { name: 'Комплектовщик', icon: '📦', salary: 12000, description: '+160 заказов в неделю' },
  marketer: { name: 'Маркетолог', icon: '📣', salary: 19000, description: '+18% к эффективности рекламы' },
  technologist: { name: 'Технолог', icon: '🧪', salary: 26000, description: 'Меньше брака на производстве' },
  accountant: { name: 'Бухгалтер', icon: '🧾', salary: 17000, description: 'Снижает налоговые и документарные риски' }
};

const AD_LEVELS = [0, 5000, 15000, 40000, 90000];
const PRICE_LEVELS = [
  { id: 'discount', name: 'Демпинг', multiplier: .88, demand: 1.28 },
  { id: 'normal', name: 'Рынок', multiplier: 1, demand: 1 },
  { id: 'premium', name: 'Премиум', multiplier: 1.22, demand: .72 }
];

const EVENT_DEFS = [
  {
    id: 'marketplace-freeze', title: 'Маркетплейс заморозил выплаты', icon: '🧊',
    condition: s => s.channels.marketplace && s.marketplaceFreeze <= 0 && s.receivables.some(r => r.channel === 'marketplace'),
    text: 'Проверка кабинета затянулась. Деньги за уже проданный товар зависли, а аренду и рекламу платить нужно сейчас.',
    choices: [
      { label: 'Переждать две недели', tone: 'secondary', effect: s => { s.marketplaceFreeze = 2; s.stress += 15; addAlert(s, 'Выплаты маркетплейса заморожены на две недели.'); } },
      { label: 'Продать долг фактору', tone: 'primary', effect: s => { const amount = s.receivables.filter(r => r.channel === 'marketplace').reduce((a,r)=>a+r.amount,0); s.receivables = s.receivables.filter(r => r.channel !== 'marketplace'); s.cash += amount * .74; s.profitTotal -= amount * .26; addAlert(s, `Факторинг принес ${money(amount * .74)}, но четверть выплаты потеряна.`); } }
    ]
  },
  {
    id: 'fire', title: 'Пожар на складе', icon: '🔥',
    condition: s => s.inventory > 80 || s.assets.warehouse || s.assets.workshop,
    text: 'Ночью сработала пожарная сигнализация. Часть товара залита водой, часть упаковки уничтожена.',
    choices: [
      { label: 'Списать потери', tone: 'danger', effect: s => { const lost = Math.ceil(s.inventory * (s.legal.insurance ? .14 : .46)); s.inventory -= lost; s.reputation -= 4; s.stress += 20; if (s.legal.insurance) s.cash += lost * unitCost(s) * .7; addAlert(s, `После пожара потеряно ${lost} ед. товара${s.legal.insurance ? ', часть компенсировала страховка' : ''}.`); } },
      { label: 'Экстренно спасать товар', tone: 'primary', effect: s => { const cost = 85000; s.cash -= cost; const lost = Math.ceil(s.inventory * .16); s.inventory -= lost; s.stress += 10; addAlert(s, `На спасение товара потрачено ${money(cost)}, потеряно ${lost} ед.`); } }
    ]
  },
  {
    id: 'sanctions', title: 'Сбой международных поставок', icon: '🚢',
    condition: s => s.supplyShock <= 0,
    text: 'Поставщик предупреждает о задержках и росте закупочных цен. Следующие партии обойдутся заметно дороже.',
    choices: [
      { label: 'Закупить запас сейчас', tone: 'primary', effect: s => { const qty = Math.min(120, freeStorage(s)); const cost = qty * unitCost(s); if (s.cash >= cost) { s.cash -= cost; s.inventory += qty; addAlert(s, `До скачка цен закуплено ${qty} ед. товара.`); } else { s.supplyShock = 4; addAlert(s, 'Денег на запас не хватило. Закупочные цены выросли.'); } } },
      { label: 'Работать малыми партиями', tone: 'secondary', effect: s => { s.supplyShock = 4; s.reputation -= 2; addAlert(s, 'Закупочные цены выросли на четыре недели.'); } }
    ]
  },
  {
    id: 'messenger-block', title: 'Мессенджер внезапно заблокирован', icon: '🚫',
    condition: s => s.channels.messenger && s.channelBlocks.messenger <= 0,
    text: 'Ваш основной канал прямых заказов перестал стабильно открываться. Клиенты не понимают, куда писать.',
    choices: [
      { label: 'Перевести клиентов на сайт', tone: 'primary', effect: s => { s.channelBlocks.messenger = 4; if (s.channels.store) { s.reputation += 2; s.demandBoost = Math.max(s.demandBoost, 2); } else { s.reputation -= 8; } addAlert(s, 'Продажи через мессенджер остановлены на четыре недели.'); } },
      { label: 'Искать обходные каналы', tone: 'secondary', effect: s => { s.channelBlocks.messenger = 2; s.risk += 12; s.cash -= 25000; addAlert(s, 'На временные каналы потрачено 25 тыс. ₽, юридический риск вырос.'); } }
    ]
  },
  {
    id: 'competitor-claim', title: 'Претензия от конкурента', icon: '⚖️',
    condition: s => !s.legal.trademark && !projectActive(s, 'trademark') && s.revenueTotal > 650000,
    text: 'Конкурент утверждает, что ваше название слишком похоже на его товарный знак, и требует убрать карточки.',
    choices: [
      { label: 'Юристы и защита бренда', tone: 'primary', effect: s => { s.cash -= 125000; s.risk -= 8; s.reputation += 2; addAlert(s, 'Юристы отбили часть требований, но спор обошелся дорого.'); } },
      { label: 'Срочный ребрендинг', tone: 'secondary', effect: s => { s.cash -= 42000; s.reputation -= 18; s.rating = Math.max(3.2, s.rating - .25); addAlert(s, 'Карточки и упаковка переименованы, часть аудитории потеряна.'); } }
    ]
  },
  {
    id: 'tax-notice', title: 'Требование из налоговой', icon: '🏛️',
    condition: s => s.risk > 32 || s.taxArrears > 0,
    text: 'Налоговая просит пояснить движение денег и расхождения в отчетности. Срок ответа ограничен.',
    choices: [
      { label: 'Срочно подключить специалиста', tone: 'primary', effect: s => { s.cash -= 65000; s.risk = Math.max(0, s.risk - 22); s.taxArrears = Math.max(0, s.taxArrears - 20000); addAlert(s, 'Ответ подготовлен специалистом, уровень риска снижен.'); } },
      { label: 'Ответить самостоятельно', tone: 'secondary', effect: s => { if (Math.random() < .48 + (s.staff.accountant ? .3 : 0)) { s.risk -= 8; addAlert(s, 'Пояснения приняли без дополнительных требований.'); } else { s.cash -= 110000; s.risk += 18; addAlert(s, 'Назначены доначисления и штраф на 110 тыс. ₽.'); } } }
    ]
  },
  {
    id: 'bad-batch', title: 'Бракованная партия', icon: '🧯',
    condition: s => s.productionUnlocked && s.inventory > 40 && !s.staff.technologist,
    text: 'Покупатели жалуются на нестабильное качество. Нужно решить, отзывать ли всю партию.',
    choices: [
      { label: 'Отозвать и компенсировать', tone: 'primary', effect: s => { const lost = Math.min(s.inventory, 55); s.inventory -= lost; s.cash -= 65000; s.rating = Math.max(3.4, s.rating - .08); s.reputation += 1; addAlert(s, `Отозвано ${lost} ед., клиентам выплачены компенсации.`); } },
      { label: 'Продавать дальше', tone: 'danger', effect: s => { s.risk += 24; s.rating = Math.max(2.9, s.rating - .55); s.reputation -= 18; addAlert(s, 'Отзывы обрушили рейтинг, риск претензий резко вырос.'); } }
    ]
  },
  {
    id: 'viral', title: 'Ваш товар завирусился', icon: '📱',
    condition: s => s.inventory > 20,
    text: 'Короткое видео с товаром неожиданно набрало сотни тысяч просмотров. Спрос резко вырос.',
    choices: [
      { label: 'Удвоить рекламу', tone: 'primary', effect: s => { s.cash -= 50000; s.demandBoost = 4; s.reputation += 12; addAlert(s, 'Вирусный спрос поддержан рекламой на четыре недели.'); } },
      { label: 'Снять прибыль без риска', tone: 'secondary', effect: s => { s.demandBoost = 2; s.reputation += 6; addAlert(s, 'Спрос вырастет на две недели.'); } }
    ]
  },
  {
    id: 'reviews', title: 'Волна негативных отзывов', icon: '⭐',
    condition: s => s.channels.marketplace && s.unitsSold > 120,
    text: 'Несколько покупателей подряд пожаловались на упаковку и доставку. Рейтинг карточки начал падать.',
    choices: [
      { label: 'Компенсации и новая упаковка', tone: 'primary', effect: s => { s.cash -= 48000; s.rating = Math.min(5, s.rating + .08); s.reputation += 3; addAlert(s, 'Проблемные заказы компенсированы, упаковка усилена.'); } },
      { label: 'Не реагировать', tone: 'secondary', effect: s => { s.rating = Math.max(3.1, s.rating - .38); s.reputation -= 10; addAlert(s, 'Рейтинг карточек заметно снизился.'); } }
    ]
  },
  {
    id: 'wholesale-order', title: 'Крупный оптовый заказ', icon: '🚚',
    condition: s => s.inventory >= 120,
    text: 'Региональная сеть готова забрать большую партию, но требует скидку и отсрочку.',
    choices: [
      { label: 'Отгрузить 120 единиц', tone: 'primary', effect: s => { const qty = Math.min(120, s.inventory); s.inventory -= qty; const amount = qty * retailPrice(s) * .64; s.receivables.push({ amount, dueWeek: s.week + 2, channel: 'wholesale' }); s.revenueTotal += amount; s.taxDue += amount * .06; s.unitsSold += qty; addAlert(s, `Оптовику отгружено ${qty} ед. на ${money(amount)}.`); } },
      { label: 'Отказаться и сохранить маржу', tone: 'secondary', effect: s => { s.reputation += 1; addAlert(s, 'Вы отказались от низкомаржинального оптового заказа.'); } }
    ]
  }
];

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function random(min, max) { return min + Math.random() * (max - min); }
function money(n) {
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(n || 0);
  if (v >= 1e9) return `${sign}${(v / 1e9).toFixed(v >= 1e10 ? 1 : 2)} млрд ₽`;
  if (v >= 1e6) return `${sign}${(v / 1e6).toFixed(v >= 1e8 ? 0 : 1)} млн ₽`;
  if (v >= 1e3) return `${sign}${Math.round(v / 1000)} тыс. ₽`;
  return `${sign}${Math.round(v)} ₽`;
}
function pct(n) { return `${Math.round(n)}%`; }
function esc(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function addAlert(s, text) { s.alerts.unshift({ week: s.week, text }); s.alerts = s.alerts.slice(0, 30); }
function niche(s) { return NICHES[s.niche] || NICHES.beauty; }
function route(s) { return ROUTES[s.route] || ROUTES.resale; }
function priceLevel(s) { return PRICE_LEVELS.find(p => p.id === s.priceMode) || PRICE_LEVELS[1]; }
function unitCost(s) { return Math.round(niche(s).buyCost * (s.supplyShock > 0 ? 1.32 : 1)); }
function retailPrice(s) { return Math.round(niche(s).retail * priceLevel(s).multiplier); }
function rawUnitCost(s) { return Math.round(niche(s).rawCost * (s.supplyShock > 0 ? 1.22 : 1)); }
function storageCapacity(s) { return Math.floor((180 + (s.assets.warehouse ? 1100 : 0)) / niche(s).storage); }
function freeStorage(s) { return Math.max(0, storageCapacity(s) - s.inventory - s.raw); }
function orderCapacity(s) { return 95 + (s.staff.packer ? 160 : 0) + (s.assets.warehouse ? 90 : 0); }
function productionCapacity(s) { return [0, 45, 135, 420][s.assets.equipment] || 0; }
function projectActive(s, id) { return s.projects.some(p => p.id === id); }
function activeStaffCount(s) { return Object.values(s.staff).filter(Boolean).length; }
function weeklyFixedCosts(s) {
  let total = 3200;
  if (s.assets.workshop) total += 24000;
  if (s.assets.warehouse) total += 15000;
  if (s.channels.store) total += 4500;
  Object.entries(s.staff).forEach(([id, active]) => { if (active) total += STAFF[id].salary; });
  Object.values(s.adBudgets).forEach(v => total += v);
  return total;
}
function avgProfit(s) {
  const rows = s.history.slice(0, 6);
  return rows.length ? rows.reduce((a, r) => a + r.profit, 0) / rows.length : 0;
}
function valuation(s) {
  const assets = s.assets.equipment * 170000 + (s.assets.workshop ? 70000 : 0) + (s.assets.warehouse ? 50000 : 0);
  const brand = s.reputation * 12000 + (s.legal.trademark ? 650000 : 0) + s.rating * 45000;
  const operations = Math.max(0, avgProfit(s) * 18);
  const working = s.cash + s.inventory * unitCost(s) * .65 + s.raw * rawUnitCost(s) * .6 + s.receivables.reduce((a,r)=>a+r.amount,0) - s.debt - s.taxArrears;
  return Math.max(0, working + assets + brand + operations);
}
function defaultState() {
  return {
    version: 3, started: false, company: 'Северный Лист', niche: 'beauty', route: 'resale',
    week: 1, cash: 0, debt: 0, ownerMoney: 0, inventory: 0, raw: 0,
    reputation: 0, rating: 4.45, risk: 10, stress: 10, quality: 62,
    channels: { marketplace: false, messenger: false, store: false, wholesale: false },
    channelBlocks: { messenger: 0, store: 0 }, adBudgets: { marketplace: 5000, messenger: 0, store: 0, wholesale: 0 },
    priceMode: 'normal', assets: { workshop: false, warehouse: false, equipment: 0 },
    staff: { packer: false, marketer: false, technologist: false, accountant: false },
    legal: { declaration: false, trademark: false, cashbox: false, offer: false, marking: false, insurance: false, fireSafety: false },
    projects: [], receivables: [], marketplaceFreeze: 0, supplyShock: 0, demandBoost: 0,
    taxDue: 0, taxArrears: 0, revenueTotal: 0, profitTotal: 0, unitsSold: 0, bestCash: 0,
    history: [], alerts: [], milestones: {}, pendingEvent: null, gameOver: false, lastSaved: Date.now(), activeTab: 'overview'
  };
}

function startState(company, nicheId, routeId) {
  const r = ROUTES[routeId];
  const s = defaultState();
  s.started = true; s.company = company || 'Новый бизнес'; s.niche = nicheId; s.route = routeId;
  s.cash = r.cash; s.debt = r.debt; s.inventory = r.inventory; s.raw = r.raw;
  s.assets.workshop = r.workshop; s.assets.equipment = r.equipment;
  s.channels.marketplace = r.marketplace; s.channels.messenger = r.messenger;
  s.reputation = r.reputation; s.risk = r.risk;
  if (routeId === 'production') addAlert(s, 'Производство арендовано, но для легального выпуска нужны документы.');
  else addAlert(s, 'Бизнес открыт. Первые продажи уже можно запускать.');
  return s;
}

function weekLabel(s) {
  const date = new Date(2026, 0, 5 + (s.week - 1) * 7);
  return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} · неделя ${s.week}`;
}

function completeProject(s, p) {
  if (p.id === 'declaration') { s.legal.declaration = true; s.productionUnlocked = true; s.risk -= 8; addAlert(s, 'Декларация зарегистрирована. Легальное производство доступно.'); }
  if (p.id === 'trademark') { s.legal.trademark = true; s.reputation += 8; addAlert(s, 'Товарный знак зарегистрирован. Бренд получил защиту.'); }
  if (p.id === 'marking') { s.legal.marking = true; s.risk -= 8; addAlert(s, 'Контур маркировки настроен.'); }
  if (p.id === 'store') { s.channels.store = true; s.reputation += 4; addAlert(s, 'Интернет-магазин запущен.'); }
}

function processProjects(s) {
  s.projects.forEach(p => p.weeks -= 1);
  const done = s.projects.filter(p => p.weeks <= 0);
  s.projects = s.projects.filter(p => p.weeks > 0);
  done.forEach(p => completeProject(s, p));
}

function processReceivables(s) {
  let paid = 0;
  s.receivables.forEach(r => {
    if (r.channel === 'marketplace' && s.marketplaceFreeze > 0) r.dueWeek += 1;
  });
  const due = s.receivables.filter(r => r.dueWeek <= s.week);
  s.receivables = s.receivables.filter(r => r.dueWeek > s.week);
  due.forEach(r => { paid += r.amount; });
  s.cash += paid;
  return paid;
}

function channelAvailable(s, id) {
  if (!s.channels[id]) return false;
  if ((s.channelBlocks[id] || 0) > 0) return false;
  return true;
}

function simulateSales(s) {
  const n = niche(s);
  const p = priceLevel(s);
  const active = Object.keys(CHANNELS).filter(id => channelAvailable(s, id));
  if (!active.length || s.inventory <= 0) return { revenue: 0, fees: 0, ads: 0, sold: 0, lost: 0, details: [] };

  const adsTotal = active.reduce((a,id)=>a+(s.adBudgets[id]||0),0);
  const adsPower = 1 + Math.sqrt(adsTotal / 5000) * .11 * (s.staff.marketer ? 1.18 : 1);
  const repPower = .68 + s.reputation / 85;
  const ratingPower = clamp(.55 + (s.rating - 3) * .35, .45, 1.35);
  const boost = s.demandBoost > 0 ? 1.55 : 1;
  const demand = Math.max(0, Math.round(n.baseDemand * p.demand * adsPower * repPower * ratingPower * boost * random(.78, 1.25)));
  const capacity = orderCapacity(s);
  const possible = Math.min(s.inventory, capacity, demand);
  const lost = Math.max(0, demand - possible);
  if (lost > 15) { s.reputation -= Math.min(3, lost / 100); s.stress += 2; }

  const totalWeight = active.reduce((a,id)=>a+CHANNELS[id].weight*(1+Math.sqrt((s.adBudgets[id]||0)/5000)*.18),0);
  let remaining = possible;
  let revenue = 0, fees = 0, sold = 0;
  const details = [];

  active.forEach((id, index) => {
    const ch = CHANNELS[id];
    let qty = index === active.length - 1 ? remaining : Math.min(remaining, Math.round(possible * (ch.weight * (1 + Math.sqrt((s.adBudgets[id] || 0) / 5000) * .18)) / totalWeight));
    remaining -= qty;
    if (qty <= 0) return;
    const returnRate = id === 'wholesale' ? .02 : clamp(n.returnRate + (4.35 - s.rating) * .08, .01, .35);
    const returned = Math.round(qty * returnRate * random(.7, 1.25));
    const damagedReturns = Math.round(returned * .35);
    const net = Math.max(0, qty - returned);
    const unitPrice = id === 'wholesale' ? retailPrice(s) * .67 : retailPrice(s);
    const gross = net * unitPrice;
    const channelFees = gross * ch.commission + qty * ch.logistics;
    const payout = Math.max(0, gross - channelFees);

    s.inventory -= qty;
    s.inventory += Math.max(0, returned - damagedReturns);
    sold += net;
    revenue += gross;
    fees += channelFees;
    if (ch.delay > 0) s.receivables.push({ amount: payout, dueWeek: s.week + ch.delay, channel: id });
    else s.cash += payout;
    details.push({ id, qty: net, revenue: gross, payout });
  });

  s.unitsSold += sold;
  s.revenueTotal += revenue;
  s.taxDue += revenue * .06;
  return { revenue, fees, ads: adsTotal, sold, lost, details };
}

function applyWeeklyCosts(s) {
  const fixed = weeklyFixedCosts(s);
  const interest = s.debt * .009;
  s.cash -= fixed + interest;
  return { fixed, interest };
}

function settleTaxes(s) {
  if (s.week % 4 !== 0) return { paid: 0, arrears: 0 };
  const due = s.taxDue + s.taxArrears;
  s.taxDue = 0; s.taxArrears = 0;
  if (s.cash >= due) { s.cash -= due; s.risk = Math.max(0, s.risk - 2); return { paid: due, arrears: 0 }; }
  const paid = Math.max(0, s.cash);
  s.cash -= paid;
  s.taxArrears = due - paid;
  s.risk += 14;
  return { paid, arrears: s.taxArrears };
}

function decayCounters(s) {
  ['marketplaceFreeze','supplyShock','demandBoost'].forEach(k => { if (s[k] > 0) s[k] -= 1; });
  Object.keys(s.channelBlocks).forEach(k => { if (s.channelBlocks[k] > 0) s.channelBlocks[k] -= 1; });
}

function updateHealth(s, profit) {
  const compliance = Object.values(s.legal).filter(Boolean).length;
  s.risk += (s.productionUnlocked && !s.legal.declaration ? 3 : 0);
  s.risk += (s.revenueTotal > 500000 && !s.legal.trademark ? .8 : 0);
  s.risk += (niche(s).marked && s.productionUnlocked && !s.legal.marking ? 1.5 : 0);
  s.risk -= s.staff.accountant ? 1.4 : 0;
  s.risk -= compliance * .08;
  s.risk = clamp(s.risk, 0, 100);

  s.stress += s.cash < weeklyFixedCosts(s) * 2 ? 6 : -2;
  s.stress += profit < 0 ? 3 : -1;
  s.stress += s.debt > 800000 ? 2 : 0;
  s.stress = clamp(s.stress, 0, 100);
  s.reputation = clamp(s.reputation, 0, 100);
  s.rating = clamp(s.rating, 2.5, 5);
  s.bestCash = Math.max(s.bestCash, s.cash);
}

function checkMilestones(s) {
  const list = [
    ['millionRevenue', s.revenueTotal >= 1000000, 'Первый миллион выручки'],
    ['production', s.productionUnlocked && s.assets.workshop && s.assets.equipment > 0, 'Собственное производство запущено'],
    ['trademark', s.legal.trademark, 'Бренд защищен товарным знаком'],
    ['valuation10m', valuation(s) >= 10000000, 'Оценка бизнеса превысила 10 млн ₽'],
    ['ownerMillion', s.ownerMoney >= 1000000, 'Личный капитал владельца превысил миллион']
  ];
  list.forEach(([id, ok, text]) => {
    if (ok && !s.milestones[id]) { s.milestones[id] = true; addAlert(s, `Достижение: ${text}.`); }
  });
}

function chooseEvent(s) {
  if (s.pendingEvent) return EVENT_DEFS.find(e => e.id === s.pendingEvent) || null;
  if (Math.random() > .52) return null;
  const eligible = EVENT_DEFS.filter(e => e.condition(s));
  if (!eligible.length) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

function advanceWeek(s) {
  if (s.gameOver) return { event: null, summary: null };
  s.week += 1;
  processProjects(s);
  const openingLiquid = s.cash + s.receivables.reduce((a,r)=>a+r.amount,0);
  const payouts = processReceivables(s);
  const sales = simulateSales(s);
  const costs = applyWeeklyCosts(s);
  const taxes = settleTaxes(s);
  const profit = s.cash + s.receivables.reduce((a,r)=>a+r.amount,0) - openingLiquid;
  s.profitTotal += profit;
  s.history.unshift({ week: s.week, revenue: sales.revenue, profit, sold: sales.sold, fixed: costs.fixed, interest: costs.interest, taxes: taxes.paid });
  s.history = s.history.slice(0, 18);
  updateHealth(s, profit);
  checkMilestones(s);

  if (s.cash < -320000 || (s.taxArrears > 400000 && s.cash < 0)) {
    s.gameOver = true;
    addAlert(s, 'Бизнес не смог обслуживать обязательства. Начата процедура закрытия.');
  }

  const event = chooseEvent(s);
  if (event) s.pendingEvent = event.id;
  decayCounters(s);
  return { event, summary: { ...sales, ...costs, ...taxes, payouts, profit } };
}

function currentTasks(s) {
  const tasks = [];
  if (s.inventory < 25) tasks.push('Пополните товарный запас, иначе реклама будет сгорать впустую.');
  if (!s.legal.trademark && s.revenueTotal > 250000) tasks.push('Подайте товарный знак до появления претензий конкурентов.');
  if (!s.channels.store) tasks.push('Интернет-магазин снизит зависимость от площадок и блокировок мессенджеров.');
  if (!s.legal.declaration && s.assets.workshop) tasks.push('Производство без декларации не может работать легально.');
  if (s.taxArrears > 0) tasks.push(`Погасите налоговую задолженность: ${money(s.taxArrears)}.`);
  if (s.debt > s.cash * 3 && s.debt > 300000) tasks.push('Долговая нагрузка становится опасной.');
  if (!tasks.length) tasks.push('Бизнес стабилен. Можно масштабировать продажи или выводить прибыль владельцу.');
  return tasks.slice(0, 3);
}

export const millionaire = {
  id: 'millionaire',
  title: 'ИП: Режим выживания',
  icon: '🏭',
  players: 1,
  duration: '20 минут и больше',
  description: 'Жесткий симулятор российского малого бизнеса: маркетплейсы, производство, документы, кредиты и кризисы.',

  mount(ctx) {
    let state = ctx.storage.read(null);
    if (!state || state.version !== 3) state = defaultState();
    let selectedNiche = state.niche || 'beauty';
    let selectedRoute = state.route || 'resale';

    const save = () => { state.lastSaved = Date.now(); ctx.storage.write(state); };

    function startScreen() {
      ctx.root.innerHTML = `
        <div class="game-shell biz-shell biz-start-shell">
          <div class="biz-start-scroll">
            <section class="biz-intro">
              <div class="biz-intro-icon">🏭</div>
              <div class="eyebrow">Экономический симулятор · Россия 2026</div>
              <h2>ИП: Режим выживания</h2>
              <p>Не кликер. Вы управляете оборотным капиталом, закупками, производством, каналами продаж, документами и риском банкротства.</p>
            </section>
            <section class="biz-setup-card">
              <label class="biz-label" for="bizName">Название бизнеса</label>
              <input id="bizName" class="input" maxlength="24" value="${esc(state.company || 'Северный Лист')}">
              <div class="biz-label">Ниша</div>
              <div class="biz-choice-grid" id="nicheChoices">
                ${Object.entries(NICHES).map(([id,n]) => `<button class="biz-choice ${selectedNiche===id?'active':''}" data-niche="${id}"><span>${n.icon}</span><strong>${n.name}</strong><small>Цена ${money(n.retail)} · возвраты ${pct(n.returnRate*100)}</small></button>`).join('')}
              </div>
              <div class="biz-label">Стартовая стратегия</div>
              <div class="biz-route-list" id="routeChoices">
                ${Object.entries(ROUTES).map(([id,r]) => `<button class="biz-route ${selectedRoute===id?'active':''}" data-route="${id}"><span>${r.icon}</span><div><strong>${r.name}</strong><small>${r.description}</small></div><b>${money(r.cash)}</b></button>`).join('')}
              </div>
              <button id="startBusiness" class="primary full">Открыть бизнес</button>
              <p class="biz-disclaimer">Все суммы, сроки и правила намеренно упрощены для игры и не являются юридической или финансовой консультацией.</p>
            </section>
          </div>
        </div>`;

      ctx.root.querySelectorAll('[data-niche]').forEach(b => b.addEventListener('click', () => { selectedNiche = b.dataset.niche; startScreen(); }));
      ctx.root.querySelectorAll('[data-route]').forEach(b => b.addEventListener('click', () => { selectedRoute = b.dataset.route; startScreen(); }));
      ctx.root.querySelector('#startBusiness').addEventListener('click', () => {
        const name = ctx.root.querySelector('#bizName').value.trim();
        state = startState(name, selectedNiche, selectedRoute);
        save(); render();
      });
    }

    function kpis() {
      const receive = state.receivables.reduce((a,r)=>a+r.amount,0);
      return `
        <div class="biz-kpis">
          <div><small>Деньги</small><strong class="${state.cash<0?'negative':''}">${money(state.cash)}</strong></div>
          <div><small>К получению</small><strong>${money(receive)}</strong></div>
          <div><small>Товар</small><strong>${Math.round(state.inventory)} ед.</strong></div>
          <div><small>Оценка</small><strong>${money(valuation(state))}</strong></div>
        </div>`;
    }

    function statusBar() {
      return `
        <div class="biz-health">
          <div><span>Репутация</span><b>${Math.round(state.reputation)}</b><i><em style="width:${state.reputation}%"></em></i></div>
          <div><span>Риск</span><b>${Math.round(state.risk)}</b><i class="risk"><em style="width:${state.risk}%"></em></i></div>
          <div><span>Стресс</span><b>${Math.round(state.stress)}</b><i class="stress"><em style="width:${state.stress}%"></em></i></div>
        </div>`;
    }

    function tabButtons() {
      const tabs = [
        ['overview','Обзор','📊'],['operations','Операции','📦'],['sales','Продажи','🛒'],['legal','Документы','⚖️'],['finance','Финансы','₽']
      ];
      return `<div class="biz-tabs">${tabs.map(([id,name,icon])=>`<button class="${state.activeTab===id?'active':''}" data-tab="${id}"><span>${icon}</span>${name}</button>`).join('')}</div>`;
    }

    function overviewTab() {
      const latest = state.history[0];
      const milestones = Object.values(state.milestones).filter(Boolean).length;
      return `
        <section class="biz-grid-two">
          <article class="biz-card biz-summary-card">
            <div class="biz-card-title"><h3>Сводка недели</h3><span class="biz-rating">★ ${state.rating.toFixed(2)}</span></div>
            ${latest ? `<div class="biz-summary-numbers"><div><small>Выручка</small><strong>${money(latest.revenue)}</strong></div><div><small>Результат</small><strong class="${latest.profit<0?'negative':'positive'}">${money(latest.profit)}</strong></div><div><small>Продано</small><strong>${latest.sold} ед.</strong></div></div>` : '<p class="muted">Проведите первую неделю, чтобы увидеть результат.</p>'}
            <div class="biz-route-badge">${route(state).icon} ${route(state).name} · ${niche(state).icon} ${niche(state).name}</div>
          </article>
          <article class="biz-card">
            <div class="biz-card-title"><h3>Приоритеты</h3><span>${milestones}/5 целей</span></div>
            <div class="biz-task-list">${currentTasks(state).map(t=>`<div><span>›</span><p>${t}</p></div>`).join('')}</div>
          </article>
        </section>
        <section class="biz-card">
          <div class="biz-card-title"><h3>Последние события</h3><span>${weekLabel(state)}</span></div>
          <div class="biz-alerts">${state.alerts.slice(0,6).map(a=>`<div><b>Нед. ${a.week}</b><p>${esc(a.text)}</p></div>`).join('') || '<p class="muted">Событий пока нет.</p>'}</div>
        </section>
        <section class="biz-card">
          <div class="biz-card-title"><h3>Проекты</h3><span>${state.projects.length}</span></div>
          <div class="biz-projects">${state.projects.length ? state.projects.map(p=>`<div><span>${p.icon}</span><div><strong>${p.name}</strong><small>Осталось недель: ${p.weeks}</small></div></div>`).join('') : '<p class="muted">Нет проектов в работе.</p>'}</div>
        </section>`;
    }

    function operationButton(action, title, desc, cost, disabled=false, icon='📦') {
      return `<button class="biz-action" data-action="${action}" ${disabled?'disabled':''}><span>${icon}</span><div><strong>${title}</strong><small>${desc}</small></div><b>${cost}</b></button>`;
    }

    function operationsTab() {
      const buyCost = unitCost(state);
      const prodAvailable = state.legal.declaration && state.assets.workshop && state.assets.equipment > 0;
      return `
        <section class="biz-card">
          <div class="biz-card-title"><h3>Товар и сырье</h3><span>${Math.round(state.inventory + state.raw)} / ${storageCapacity(state)}</span></div>
          <div class="biz-action-list">
            ${operationButton('buy-20','Закупить 20 единиц',`Себестоимость ${money(buyCost)} за единицу`,money(buyCost*20),freeStorage(state)<20||state.cash<buyCost*20,'📦')}
            ${operationButton('buy-60','Закупить 60 единиц','Готовый товар для перепродажи',money(buyCost*60),freeStorage(state)<60||state.cash<buyCost*60,'🚚')}
            ${operationButton('raw-100','Закупить сырье на 100 единиц',`Сырье ${money(rawUnitCost(state))} за единицу`,money(rawUnitCost(state)*100),freeStorage(state)<100||state.cash<rawUnitCost(state)*100,'🧪')}
            ${operationButton('produce','Запустить производство',prodAvailable?`До ${productionCapacity(state)} ед. за неделю`:'Нужны декларация, цех и оборудование',prodAvailable?money(Math.min(state.raw,productionCapacity(state))*niche(state).productionCost):'Закрыто',!prodAvailable||state.raw<=0,'🏭')}
          </div>
        </section>
        <section class="biz-grid-two">
          <article class="biz-card">
            <div class="biz-card-title"><h3>Помещения</h3><span>Недельная аренда</span></div>
            <div class="biz-mini-list">
              <button data-action="toggle-workshop"><span>🏭</span><div><strong>Производственный цех</strong><small>${state.assets.workshop?'Аренда 24 тыс. ₽/нед.':'Депозит 75 тыс. ₽'}</small></div><b>${state.assets.workshop?'Закрыть':'Арендовать'}</b></button>
              <button data-action="toggle-warehouse"><span>🏢</span><div><strong>Склад</strong><small>${state.assets.warehouse?'Вместимость +1100 ед.':'Депозит 55 тыс. ₽'}</small></div><b>${state.assets.warehouse?'Закрыть':'Арендовать'}</b></button>
            </div>
          </article>
          <article class="biz-card">
            <div class="biz-card-title"><h3>Оборудование</h3><span>Уровень ${state.assets.equipment}</span></div>
            <div class="biz-equipment"><div class="biz-equipment-visual">${['👐','⚙️','🏗️','🏭'][state.assets.equipment]}</div><strong>${['Ручная работа','Настольное оборудование','Полуавтоматическая линия','Промышленная линия'][state.assets.equipment]}</strong><small>Мощность: ${productionCapacity(state)} ед./нед.</small><button class="primary" data-action="equipment" ${state.assets.equipment>=3?'disabled':''}>${state.assets.equipment>=3?'Максимум':`Улучшить за ${money([0,120000,390000,1350000][state.assets.equipment+1])}`}</button></div>
          </article>
        </section>
        <section class="biz-card">
          <div class="biz-card-title"><h3>Команда</h3><span>${activeStaffCount(state)} сотрудника</span></div>
          <div class="biz-staff-grid">${Object.entries(STAFF).map(([id,st])=>`<button class="biz-staff ${state.staff[id]?'active':''}" data-staff="${id}"><span>${st.icon}</span><strong>${st.name}</strong><small>${st.description}</small><b>${state.staff[id]?'Уволить':`${money(st.salary)}/нед.`}</b></button>`).join('')}</div>
        </section>`;
    }

    function channelCard(id) {
      const c = CHANNELS[id];
      const active = state.channels[id];
      const blocked = (state.channelBlocks[id] || 0) > 0 || (id === 'marketplace' && state.marketplaceFreeze > 0);
      const budgetIndex = AD_LEVELS.indexOf(state.adBudgets[id] || 0);
      const requirements = id === 'store' ? (!state.legal.cashbox || !state.legal.offer ? 'Нужны касса и документы сайта' : '') : '';
      return `<article class="biz-channel ${active?'active':''} ${blocked?'blocked':''}">
        <div class="biz-channel-head"><span>${c.icon}</span><div><strong>${c.name}</strong><small>${blocked?`Недоступно еще ${id==='marketplace'?state.marketplaceFreeze:state.channelBlocks[id]} нед.`:`Комиссия около ${pct(c.commission*100)}`}</small></div><button data-channel="${id}">${active?'Закрыть':'Открыть'}</button></div>
        ${requirements?`<div class="biz-warning">${requirements}</div>`:''}
        <div class="biz-budget"><span>Реклама</span><button data-budget="${id}" ${!active?'disabled':''}>${money(AD_LEVELS[Math.max(0,budgetIndex)])}/нед. ↻</button></div>
      </article>`;
    }

    function salesTab() {
      return `
        <section class="biz-card">
          <div class="biz-card-title"><h3>Цена</h3><span>Розница ${money(retailPrice(state))}</span></div>
          <div class="biz-price-switch">${PRICE_LEVELS.map(p=>`<button data-price="${p.id}" class="${state.priceMode===p.id?'active':''}"><strong>${p.name}</strong><small>×${p.multiplier.toFixed(2)} к цене</small></button>`).join('')}</div>
        </section>
        <section class="biz-channels">${Object.keys(CHANNELS).map(channelCard).join('')}</section>
        <section class="biz-card">
          <div class="biz-card-title"><h3>Мощность продаж</h3><span>${orderCapacity(state)} заказов/нед.</span></div>
          <div class="biz-metric-lines">
            <div><span>Базовый спрос</span><b>${niche(state).baseDemand}</b></div>
            <div><span>Рейтинг товара</span><b>★ ${state.rating.toFixed(2)}</b></div>
            <div><span>Реклама в неделю</span><b>${money(Object.values(state.adBudgets).reduce((a,b)=>a+b,0))}</b></div>
            <div><span>Возвраты ниши</span><b>${pct(niche(state).returnRate*100)}</b></div>
          </div>
        </section>`;
    }

    function legalItem(id, icon, title, text, cost, weeks=0, disabled=false) {
      const done = state.legal[id]; const active = projectActive(state,id);
      return `<button class="biz-legal ${done?'done':''}" data-legal="${id}" ${done||active||disabled?'disabled':''}><span>${done?'✓':icon}</span><div><strong>${title}</strong><small>${done?'Готово':active?`В работе · осталось ${state.projects.find(p=>p.id===id).weeks} нед.`:text}</small></div><b>${done?'Есть':active?'Ожидание':money(cost)}</b></button>`;
    }

    function legalTab() {
      return `
        <section class="biz-card">
          <div class="biz-card-title"><h3>Документы и защита</h3><span>Риск ${Math.round(state.risk)}/100</span></div>
          <div class="biz-legal-list">
            ${legalItem('declaration','📜','Декларация соответствия','Открывает легальное производство',niche(state).declarationCost,niche(state).declarationWeeks)}
            ${legalItem('trademark','®️','Товарный знак','Защищает название и карточки товара',85000,7)}
            ${legalItem('cashbox','🧾','Онлайн-касса','Нужна для собственного интернет-магазина',42000)}
            ${legalItem('offer','📄','Оферта и политика','Документы для прямых онлайн-продаж',18000)}
            ${niche(state).marked?legalItem('marking','🔳','Маркировка товара','Настройка игрового контура маркировки',48000,2):''}
            ${legalItem('insurance','🛡️','Страхование имущества','Снижает потери при пожаре и затоплении',32000)}
            ${legalItem('fireSafety','🧯','Пожарная безопасность','Снижает риск аварий в помещении',27000,0,!state.assets.workshop&&!state.assets.warehouse)}
          </div>
          <p class="biz-disclaimer">Юридические механики — условная игровая модель, а не перечень реальных требований.</p>
        </section>`;
    }

    function financeTab() {
      const receivables = state.receivables.reduce((a,r)=>a+r.amount,0);
      return `
        <section class="biz-grid-two">
          <article class="biz-card">
            <div class="biz-card-title"><h3>Кредиты</h3><span>Долг ${money(state.debt)}</span></div>
            <div class="biz-action-list compact">
              ${operationButton('loan-100','Кредит на оборотку','Высокая недельная ставка',money(100000),state.debt>1400000,'🏦')}
              ${operationButton('loan-300','Кредит на масштабирование','Денег больше, давление тоже',money(300000),state.debt>1200000,'💳')}
              ${operationButton('repay-50','Погасить часть долга','Уменьшить процентные расходы',money(50000),state.cash<50000||state.debt<=0,'📉')}
            </div>
          </article>
          <article class="biz-card">
            <div class="biz-card-title"><h3>Владелец</h3><span>Лично ${money(state.ownerMoney)}</span></div>
            <div class="biz-action-list compact">
              ${operationButton('withdraw-20','Вывести себе','Не является расходом бизнеса в статистике',money(20000),state.cash<80000,'👤')}
              ${operationButton('withdraw-100','Крупный вывод','Может создать кассовый разрыв',money(100000),state.cash<250000,'💸')}
            </div>
          </article>
        </section>
        <section class="biz-card">
          <div class="biz-card-title"><h3>Обязательства</h3><span>Фикс. расходы ${money(weeklyFixedCosts(state))}/нед.</span></div>
          <div class="biz-metric-lines">
            <div><span>Деньги к получению</span><b>${money(receivables)}</b></div>
            <div><span>Начисленные налоги</span><b>${money(state.taxDue)}</b></div>
            <div><span>Налоговая задолженность</span><b class="${state.taxArrears>0?'negative':''}">${money(state.taxArrears)}</b></div>
            <div><span>Проценты в следующую неделю</span><b>${money(state.debt*.009)}</b></div>
          </div>
        </section>
        <section class="biz-card">
          <div class="biz-card-title"><h3>Движение денег</h3><span>последние недели</span></div>
          <div class="biz-history">${state.history.slice(0,8).map(r=>`<div><b>${r.week}</b><span>Выручка ${money(r.revenue)}</span><strong class="${r.profit<0?'negative':'positive'}">${money(r.profit)}</strong></div>`).join('') || '<p class="muted">История появится после первой недели.</p>'}</div>
        </section>`;
    }

    function content() {
      if (state.activeTab === 'operations') return operationsTab();
      if (state.activeTab === 'sales') return salesTab();
      if (state.activeTab === 'legal') return legalTab();
      if (state.activeTab === 'finance') return financeTab();
      return overviewTab();
    }

    function render() {
      if (!state.started) return startScreen();
      ctx.root.innerHTML = `
        <div class="game-shell biz-shell">
          <div class="game-toolbar biz-toolbar">
            <div class="game-status"><strong>${esc(state.company)}</strong><span>${weekLabel(state)}</span></div>
            <div class="toolbar-actions"><button class="small-button" data-action="help">?</button><button class="small-button" data-action="reset">Сброс</button></div>
          </div>
          ${kpis()}
          ${statusBar()}
          ${tabButtons()}
          <div class="biz-content">${state.gameOver ? gameOverScreen() : content()}</div>
          ${state.gameOver ? '' : `<button class="biz-next" data-action="next-week"><span>▶</span><div><strong>Следующая неделя</strong><small>Продажи, расходы, выплаты и случайное событие</small></div></button>`}
        </div>`;
      bind();
      if (state.pendingEvent) setTimeout(() => showEvent(EVENT_DEFS.find(e=>e.id===state.pendingEvent)), 30);
    }

    function gameOverScreen() {
      return `<section class="biz-gameover"><div>💥</div><h2>Бизнес не пережил кассовый разрыв</h2><p>Выручка за все время: ${money(state.revenueTotal)}. Продано: ${state.unitsSold} ед. Можно начать новую компанию с другой стратегией.</p><button class="primary" data-action="reset-confirmed">Начать заново</button></section>`;
    }

    function spend(amount) {
      if (state.cash < amount) { ctx.toast('Недостаточно денег'); return false; }
      state.cash -= amount; return true;
    }

    function buyStock(qty) {
      const cost = unitCost(state) * qty;
      if (freeStorage(state) < qty) return ctx.toast('Не хватает места на складе');
      if (!spend(cost)) return;
      state.inventory += qty; addAlert(state, `Закуплено ${qty} ед. готового товара.`); save(); render();
    }

    function buyRaw(qty) {
      const cost = rawUnitCost(state) * qty;
      if (freeStorage(state) < qty) return ctx.toast('Не хватает места на складе');
      if (!spend(cost)) return;
      state.raw += qty; addAlert(state, `Закуплено сырье на ${qty} единиц.`); save(); render();
    }

    function produce() {
      if (!state.legal.declaration || !state.assets.workshop || state.assets.equipment <= 0) return ctx.toast('Производство еще не готово');
      const qty = Math.min(state.raw, productionCapacity(state), freeStorage(state));
      if (qty <= 0) return ctx.toast('Нет сырья или места');
      const cost = qty * niche(state).productionCost;
      if (!spend(cost)) return;
      const defectRate = niche(state).defectRisk * (state.staff.technologist ? .35 : 1) * (1 - state.assets.equipment * .12);
      const good = Math.max(0, qty - Math.round(qty * defectRate * random(.5,1.5)));
      state.raw -= qty; state.inventory += good; state.productionUnlocked = true;
      state.quality = clamp(state.quality + (state.staff.technologist ? 2 : -1), 20, 100);
      addAlert(state, `Произведено ${good} годных единиц из партии ${qty}.`); save(); render();
    }

    function toggleAsset(id) {
      const isOpen = state.assets[id];
      if (!isOpen) {
        const deposit = id === 'workshop' ? 75000 : 55000;
        if (!spend(deposit)) return;
        state.assets[id] = true; addAlert(state, `${id==='workshop'?'Цех':'Склад'} арендован.`);
      } else {
        if (id === 'warehouse' && state.inventory + state.raw > storageCapacity({...state,assets:{...state.assets,warehouse:false}})) return ctx.toast('Сначала уменьшите запасы');
        state.assets[id] = false; addAlert(state, `${id==='workshop'?'Цех':'Склад'} закрыт.`);
      }
      save(); render();
    }

    function upgradeEquipment() {
      if (!state.assets.workshop) return ctx.toast('Сначала арендуйте цех');
      const next = state.assets.equipment + 1;
      const price = [0,120000,390000,1350000][next];
      if (!price || !spend(price)) return;
      state.assets.equipment = next; addAlert(state, `Оборудование улучшено до уровня ${next}.`); save(); render();
    }

    function toggleStaff(id) {
      if (state.staff[id]) { state.staff[id] = false; addAlert(state, `${STAFF[id].name} уволен.`); }
      else { state.staff[id] = true; addAlert(state, `${STAFF[id].name} принят в команду.`); }
      save(); render();
    }

    function toggleChannel(id) {
      if (state.channels[id]) { state.channels[id] = false; state.adBudgets[id] = 0; addAlert(state, `Канал «${CHANNELS[id].name}» закрыт.`); save(); return render(); }
      const costs = { marketplace: 30000, messenger: 5000, store: 95000, wholesale: 45000 };
      if (id === 'store') {
        if (!state.legal.cashbox || !state.legal.offer) return ctx.toast('Сначала оформите кассу и документы сайта');
        if (!spend(costs.store)) return;
        state.projects.push({ id:'store', name:'Разработка интернет-магазина', icon:'🌐', weeks:2 });
        addAlert(state, 'Начата разработка интернет-магазина.');
      } else {
        if (!spend(costs[id])) return;
        state.channels[id] = true; state.adBudgets[id] = id === 'marketplace' ? 5000 : 0;
        addAlert(state, `Канал «${CHANNELS[id].name}» открыт.`);
      }
      save(); render();
    }

    function cycleBudget(id) {
      const current = state.adBudgets[id] || 0;
      const index = AD_LEVELS.indexOf(current);
      state.adBudgets[id] = AD_LEVELS[(index + 1) % AD_LEVELS.length];
      save(); render();
    }

    function buyLegal(id) {
      const defs = {
        declaration: { cost:niche(state).declarationCost, weeks:niche(state).declarationWeeks, name:'Регистрация декларации', icon:'📜' },
        trademark: { cost:85000, weeks:7, name:'Регистрация товарного знака', icon:'®️' },
        cashbox: { cost:42000, weeks:0, name:'Онлайн-касса', icon:'🧾' },
        offer: { cost:18000, weeks:0, name:'Оферта и политика', icon:'📄' },
        marking: { cost:48000, weeks:2, name:'Настройка маркировки', icon:'🔳' },
        insurance: { cost:32000, weeks:0, name:'Страхование имущества', icon:'🛡️' },
        fireSafety: { cost:27000, weeks:0, name:'Пожарная безопасность', icon:'🧯' }
      };
      const d = defs[id]; if (!d || !spend(d.cost)) return;
      if (d.weeks) state.projects.push({ id, name:d.name, icon:d.icon, weeks:d.weeks });
      else { state.legal[id] = true; if (id==='insurance'||id==='fireSafety') state.risk = Math.max(0,state.risk-5); addAlert(state, `${d.name}: готово.`); }
      save(); render();
    }

    function financeAction(id) {
      if (id.startsWith('loan-')) { const amount = Number(id.split('-')[1]) * 1000; state.cash += amount; state.debt += amount; state.stress += amount/100000*2; addAlert(state, `Получен кредит ${money(amount)}.`); }
      if (id === 'repay-50') { const amount = Math.min(50000,state.debt); if (!spend(amount)) return; state.debt -= amount; addAlert(state, `Погашено ${money(amount)} долга.`); }
      if (id.startsWith('withdraw-')) { const amount = Number(id.split('-')[1]) * 1000; if (!spend(amount)) return; state.ownerMoney += amount; addAlert(state, `Владелец вывел ${money(amount)}.`); }
      save(); render();
    }

    function showWeekSummary(summary) {
      const card = ctx.showModal(`
        <div class="modal-icon">📊</div><h2>Неделя завершена</h2>
        <div class="biz-modal-stats"><div><span>Выручка</span><b>${money(summary.revenue)}</b></div><div><span>Продано</span><b>${summary.sold} ед.</b></div><div><span>Выплаты</span><b>${money(summary.payouts)}</b></div><div><span>Результат</span><b class="${summary.profit<0?'negative':'positive'}">${money(summary.profit)}</b></div></div>
        <button id="closeSummary" class="primary full">Продолжить</button>`);
      card.querySelector('#closeSummary').addEventListener('click', ctx.closeModal);
    }

    function showEvent(event) {
      if (!event) return;
      const card = ctx.showModal(`
        <div class="modal-icon">${event.icon}</div><div class="eyebrow">Внезапное событие</div><h2>${event.title}</h2><p>${event.text}</p>
        <div class="biz-event-choices">${event.choices.map((c,i)=>`<button data-choice="${i}" class="${c.tone||'secondary'}">${c.label}</button>`).join('')}</div>`);
      card.querySelectorAll('[data-choice]').forEach(b => b.addEventListener('click', () => {
        event.choices[Number(b.dataset.choice)].effect(state);
        state.pendingEvent = null; state.cash = Math.round(state.cash); state.risk = clamp(state.risk,0,100); state.stress = clamp(state.stress,0,100); state.reputation = clamp(state.reputation,0,100);
        save(); ctx.closeModal(); render();
      }));
    }

    function help() {
      const card = ctx.showModal(`<div class="modal-icon">🏭</div><h2>Как играть</h2><p>Один ход — одна неделя. До перехода недели закупайте товар, настраивайте каналы продаж, рекламу, документы и команду. Затем игра рассчитывает спрос, комиссии, возвраты, аренду, проценты и налоги.</p><p>Цель не только накопить деньги: создайте устойчивый бизнес, защитите бренд, запустите производство и выводите прибыль владельцу, не допустив кассового разрыва.</p><button id="helpClose" class="primary full">Понятно</button>`);
      card.querySelector('#helpClose').addEventListener('click',ctx.closeModal);
    }

    function resetConfirm() {
      const card = ctx.showModal(`<div class="modal-icon">🗑️</div><h2>Закрыть компанию?</h2><p>Весь прогресс этой игры будет удален.</p><div class="button-row"><button id="resetNo" class="secondary">Отмена</button><button id="resetYes" class="danger">Закрыть</button></div>`);
      card.querySelector('#resetNo').addEventListener('click',ctx.closeModal);
      card.querySelector('#resetYes').addEventListener('click',()=>{ state=defaultState(); save(); ctx.closeModal(); startScreen(); });
    }

    function bind() {
      ctx.root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.activeTab=b.dataset.tab;save();render();}));
      ctx.root.querySelectorAll('[data-price]').forEach(b=>b.addEventListener('click',()=>{state.priceMode=b.dataset.price;save();render();}));
      ctx.root.querySelectorAll('[data-staff]').forEach(b=>b.addEventListener('click',()=>toggleStaff(b.dataset.staff)));
      ctx.root.querySelectorAll('[data-channel]').forEach(b=>b.addEventListener('click',()=>toggleChannel(b.dataset.channel)));
      ctx.root.querySelectorAll('[data-budget]').forEach(b=>b.addEventListener('click',()=>cycleBudget(b.dataset.budget)));
      ctx.root.querySelectorAll('[data-legal]').forEach(b=>b.addEventListener('click',()=>buyLegal(b.dataset.legal)));
      ctx.root.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{
        const a=b.dataset.action;
        if(a==='buy-20')buyStock(20); else if(a==='buy-60')buyStock(60); else if(a==='raw-100')buyRaw(100); else if(a==='produce')produce();
        else if(a==='toggle-workshop')toggleAsset('workshop'); else if(a==='toggle-warehouse')toggleAsset('warehouse'); else if(a==='equipment')upgradeEquipment();
        else if(a.startsWith('loan-')||a.startsWith('repay-')||a.startsWith('withdraw-'))financeAction(a);
        else if(a==='help')help(); else if(a==='reset')resetConfirm(); else if(a==='reset-confirmed'){state=defaultState();save();startScreen();}
        else if(a==='next-week'){
          const result=advanceWeek(state); save(); render();
          if(!result.event) setTimeout(()=>showWeekSummary(result.summary),50);
        }
      }));
    }

    render();
    return () => save();
  },

  getStats(state) {
    if (!state || state.version !== 3 || !state.started) return { value: '—', label: 'компания не открыта' };
    return { value: money(valuation(state)).replace(' ₽',''), label: `${state.company} · оценка бизнеса` };
  }
};
