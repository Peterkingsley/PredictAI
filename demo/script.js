const markets = [
  {
    id: "fed-jul-2026",
    question: "Fed rate cut before Jul 2026?",
    category: "politics",
    probability: 64,
    noProbability: 36,
    volume: "$2.1M",
    closes: "Jul 31",
    tone: "Bullish",
    confidence: "Medium",
    take: "Traders are pricing a policy pivot before officials say it out loud.",
  },
  {
    id: "btc-120k",
    question: "BTC above $120K before year end?",
    category: "crypto",
    probability: 58,
    noProbability: 42,
    volume: "$4.6M",
    closes: "Dec 31",
    tone: "Constructive",
    confidence: "Medium",
    take: "Momentum is strong, but liquidity risk still drives the downside case.",
  },
  {
    id: "gpt6-2026",
    question: "GPT-6 released before Dec 2026?",
    category: "tech",
    probability: 37,
    noProbability: 63,
    volume: "$890K",
    closes: "Dec 15",
    tone: "Cautious",
    confidence: "Low",
    take: "The market is discounting release timing more than capability progress.",
  },
  {
    id: "eth-etf-flows",
    question: "ETH ETF weekly inflows above $1B in June?",
    category: "crypto",
    probability: 46,
    noProbability: 54,
    volume: "$1.3M",
    closes: "Jun 30",
    tone: "Mixed",
    confidence: "Medium",
    take: "Flow data is improving, but the threshold is still aggressive.",
  },
];

const state = {
  connected: false,
  wallet: null,
  balance: 125,
  selected: markets[0],
  positions: [],
  bet: {
    side: "YES",
    amount: 25,
  },
};

const chatWindow = document.querySelector("#chatWindow");
const walletStatus = document.querySelector("#walletStatus");
const balanceStatus = document.querySelector("#balanceStatus");
const connectionLine = document.querySelector("#connectionLine");
const selectedQuestion = document.querySelector("#selectedQuestion");
const selectedCategory = document.querySelector("#selectedCategory");
const selectedVolume = document.querySelector("#selectedVolume");
const selectedClose = document.querySelector("#selectedClose");
const visualPrice = document.querySelector("#visualPrice");

function money(value) {
  return value.toFixed(2);
}

function shortWallet(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function updateChrome() {
  walletStatus.textContent = state.connected ? shortWallet(state.wallet) : "Not connected";
  balanceStatus.textContent = `${money(state.balance)} USDC`;
  connectionLine.textContent = state.connected
    ? `${shortWallet(state.wallet)} active`
    : "Telegram demo session";
  selectedQuestion.textContent = state.selected.question;
  selectedCategory.textContent = state.selected.category;
  selectedVolume.textContent = `${state.selected.volume} vol`;
  selectedClose.textContent = `Closes ${state.selected.closes}`;
  visualPrice.textContent = `${state.selected.probability}%`;
}

function setActiveCommand(command) {
  document.querySelectorAll(".command").forEach((button) => {
    button.classList.toggle("active", button.dataset.command === command);
  });
}

function addMessage(html, options = {}) {
  const template = document.querySelector("#messageTemplate");
  const node = template.content.firstElementChild.cloneNode(true);
  node.classList.toggle("user", options.user === true);
  node.classList.toggle("success", options.success === true);
  node.classList.toggle("warning", options.warning === true);
  node.querySelector(".message-body").innerHTML = html;
  chatWindow.appendChild(node);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return node;
}

function clearChat() {
  chatWindow.innerHTML = "";
}

function userCommand(command) {
  addMessage(`<strong>${command}</strong>`, { user: true });
}

function marketCard(market) {
  return `
    <div class="market-card">
      <div class="market-title">${market.question}</div>
      <div class="market-meta">
        <span>${market.category}</span>
        <span>${market.probability}% Yes</span>
        <span>${market.volume} vol</span>
      </div>
      <div class="probability"><span style="width: ${market.probability}%"></span></div>
      <div class="button-row">
        <button class="secondary-action" data-action="select" data-market="${market.id}">Select</button>
        <button class="secondary-action" data-action="analyze" data-market="${market.id}">Analyze</button>
        <button class="primary-action" data-action="bet" data-market="${market.id}">Bet</button>
      </div>
    </div>
  `;
}

function showStart() {
  clearChat();
  addMessage(`
    <h3>Welcome to PredictAI</h3>
    <p>Browse prediction markets, get AI analysis, and place demo bets from a Telegram-style flow.</p>
    <div class="button-row">
      <button class="primary-action" data-action="connect">Connect wallet</button>
      <button class="secondary-action" data-action="markets">Skip for now</button>
    </div>
  `);
}

function showMarkets() {
  setActiveCommand("markets");
  userCommand("/markets");
  addMessage(`
    <h3>Top markets · updated now</h3>
    ${markets.slice(0, 3).map(marketCard).join("")}
    <div class="button-row">
      <button class="secondary-action" data-action="new">New</button>
      <button class="secondary-action" data-action="crypto">Crypto</button>
      <button class="secondary-action" data-action="tech">Tech</button>
    </div>
  `);
}

function showSingleMarket(market) {
  state.selected = market;
  updateChrome();
  addMessage(`
    <h3>${market.question}</h3>
    <p>${market.category} · ${market.probability}% Yes · ${market.volume} volume · closes ${market.closes}</p>
    <div class="probability"><span style="width: ${market.probability}%"></span></div>
    <div class="button-row">
      <button class="primary-action" data-action="bet" data-market="${market.id}">Bet</button>
      <button class="secondary-action" data-action="analyze" data-market="${market.id}">Analyze</button>
      <button class="secondary-action" data-action="alert">Set alert</button>
    </div>
  `);
}

function showAnalysis(market = state.selected) {
  setActiveCommand("analyze");
  state.selected = market;
  updateChrome();
  userCommand(`/analyze ${market.id}`);
  addMessage(`
    <h3>AI intelligence report</h3>
    <p><strong>${market.question}</strong></p>
    <p>Probability: ${market.probability}% · Confidence: ${market.confidence} · Tone: ${market.tone}</p>
    <div class="signal-stack">
      <div class="signal-row"><span>X sentiment</span><meter min="0" max="100" value="61"></meter><strong>+0.61</strong></div>
      <div class="signal-row"><span>News velocity</span><meter min="0" max="100" value="54"></meter><strong>mid</strong></div>
      <div class="signal-row"><span>On-chain flows</span><meter min="0" max="100" value="68"></meter><strong>accum.</strong></div>
    </div>
    <p>${market.take}</p>
    <div class="button-row">
      <button class="primary-action" data-action="bet-yes" data-market="${market.id}">Bet Yes</button>
      <button class="secondary-action" data-action="bet-no" data-market="${market.id}">Bet No</button>
      <button class="secondary-action" data-action="share">Share</button>
    </div>
  `);
}

function connectWallet() {
  if (!state.connected) {
    state.connected = true;
    state.wallet = "0x3f4a9168b22c70c946e12e5fb81c8ad9b91c";
    updateChrome();
  }
  userCommand("/connect");
  addMessage(`
    <h3>Wallet connected</h3>
    <p>${shortWallet(state.wallet)}</p>
    <p>USDC balance: ${money(state.balance)}</p>
    <div class="button-row">
      <button class="secondary-action" data-action="markets">/markets</button>
      <button class="secondary-action" data-action="analyze">/analyze</button>
    </div>
  `, { success: true });
}

function startBet(market = state.selected, side = "YES") {
  setActiveCommand("bet");
  state.selected = market;
  state.bet.side = side;
  updateChrome();
  userCommand(`/bet ${market.id}`);

  if (!state.connected) {
    addMessage(`
      <h3>Wallet needed</h3>
      <p>Connect a wallet to place demo bets.</p>
      <div class="button-row">
        <button class="primary-action" data-action="connect-then-bet">Connect wallet</button>
        <button class="secondary-action" data-action="cancel">Cancel</button>
      </div>
    `, { warning: true });
    return;
  }

  addMessage(`
    <h3>${market.question}</h3>
    <p>Which side?</p>
    <div class="button-row">
      <button class="primary-action" data-action="choose-side" data-side="YES">Yes · ${market.probability}%</button>
      <button class="secondary-action" data-action="choose-side" data-side="NO">No · ${market.noProbability}%</button>
      <button class="secondary-action" data-action="cancel">Cancel</button>
    </div>
  `);
}

function chooseAmount(side) {
  state.bet.side = side;
  addMessage(`
    <h3>Betting ${side === "YES" ? "Yes" : "No"}</h3>
    <p>How much USDC?</p>
    <div class="amount-grid">
      <button class="chip" data-action="amount" data-amount="5">$5</button>
      <button class="chip" data-action="amount" data-amount="10">$10</button>
      <button class="chip" data-action="amount" data-amount="25">$25</button>
      <button class="chip" data-action="amount" data-amount="50">$50</button>
    </div>
    <p>Balance: ${money(state.balance)} USDC</p>
  `);
}

function confirmBet(amount) {
  state.bet.amount = Number(amount);
  const price = state.bet.side === "YES"
    ? state.selected.probability / 100
    : state.selected.noProbability / 100;
  const shares = state.bet.amount / price;
  addMessage(`
    <h3>Confirm your bet</h3>
    <p>Market: ${state.selected.question}</p>
    <p>Position: ${state.bet.side === "YES" ? "Yes" : "No"}<br>
    Amount: ${money(state.bet.amount)} USDC<br>
    Shares: ${shares.toFixed(2)}<br>
    Max payout: ${shares.toFixed(2)} USDC</p>
    <div class="button-row">
      <button class="primary-action" data-action="confirm-bet">Confirm bet</button>
      <button class="secondary-action" data-action="cancel">Cancel</button>
    </div>
  `);
}

function placeBet() {
  if (state.bet.amount > state.balance) {
    addMessage(`
      <h3>Insufficient balance</h3>
      <p>You need ${money(state.bet.amount)} USDC but have ${money(state.balance)}.</p>
      <div class="button-row">
        <button class="secondary-action" data-action="choose-side" data-side="${state.bet.side}">Change amount</button>
      </div>
    `, { warning: true });
    return;
  }

  addMessage(`
    <h3>Waiting for signature</h3>
    <p>Demo wallet approval simulated for ${shortWallet(state.wallet)}.</p>
  `);

  window.setTimeout(() => {
    state.balance -= state.bet.amount;
    state.positions.unshift({
      market: state.selected.question,
      side: state.bet.side,
      amount: state.bet.amount,
      pnl: Number((state.bet.amount * 0.136).toFixed(2)),
    });
    updateChrome();
    addMessage(`
      <h3>Bet placed</h3>
      <p>${money(state.bet.amount)} USDC on ${state.bet.side === "YES" ? "Yes" : "No"} · ${state.selected.question}</p>
      <div class="button-row">
        <button class="primary-action" data-action="portfolio">/portfolio</button>
        <button class="secondary-action" data-action="share">Share</button>
      </div>
    `, { success: true });
  }, 700);
}

function showPortfolio() {
  setActiveCommand("portfolio");
  userCommand("/portfolio");

  if (!state.connected) {
    addMessage(`
      <h3>No wallet connected</h3>
      <p>Connect a demo wallet to see portfolio tracking.</p>
      <div class="button-row">
        <button class="primary-action" data-action="connect">Connect wallet</button>
      </div>
    `, { warning: true });
    return;
  }

  const positions = state.positions.length
    ? state.positions
        .map((position) => `
          <div class="portfolio-item">
            <div class="market-title">${position.market}</div>
            <div class="portfolio-meta">
              <span>${position.side}</span>
              <span>${money(position.amount)} USDC</span>
              <span>${position.pnl >= 0 ? "+" : ""}${money(position.pnl)} P&L</span>
            </div>
            <div class="button-row">
              <button class="secondary-action" data-action="sell">Sell</button>
              <button class="secondary-action" data-action="details">Details</button>
            </div>
          </div>
        `)
        .join("")
    : `<p>No open demo positions yet.</p>`;

  const pnl = state.positions.reduce((sum, position) => sum + position.pnl, 0);
  addMessage(`
    <h3>Your portfolio</h3>
    <p>P&L today: ${pnl >= 0 ? "+" : ""}$${money(pnl)} · Open bets: ${state.positions.length}<br>
    Wallet: ${shortWallet(state.wallet)}</p>
    ${positions}
  `);
}

function handleAction(action, target) {
  const market = markets.find((item) => item.id === target.dataset.market) || state.selected;

  if (action === "connect") connectWallet();
  if (action === "connect-then-bet") {
    connectWallet();
    window.setTimeout(() => startBet(state.selected, state.bet.side), 300);
  }
  if (action === "markets" || action === "new" || action === "crypto" || action === "tech") showMarkets();
  if (action === "select") showSingleMarket(market);
  if (action === "analyze") showAnalysis(market);
  if (action === "bet") startBet(market, "YES");
  if (action === "bet-yes") startBet(market, "YES");
  if (action === "bet-no") startBet(market, "NO");
  if (action === "choose-side") chooseAmount(target.dataset.side);
  if (action === "amount") confirmBet(target.dataset.amount);
  if (action === "confirm-bet") placeBet();
  if (action === "portfolio") showPortfolio();
  if (action === "cancel") addMessage("<h3>Cancelled</h3><p>The demo flow was cleared.</p>");
  if (action === "alert") addMessage("<h3>Alert set</h3><p>You will be notified when this market crosses your selected threshold.</p>", { success: true });
  if (action === "share") addMessage("<h3>Share preview</h3><p>PredictAI says this market is worth watching. Demo share text copied conceptually.</p>");
  if (action === "sell") addMessage("<h3>Sell preview</h3><p>The real product will open the same wallet signature flow for closing a position.</p>");
  if (action === "details") addMessage("<h3>Position details</h3><p>Entry, current price, shares, and settlement status would appear here.</p>");
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  handleAction(target.dataset.action, target);
});

document.querySelectorAll(".command").forEach((button) => {
  button.addEventListener("click", () => {
    const command = button.dataset.command;
    if (command === "markets") showMarkets();
    if (command === "analyze") showAnalysis();
    if (command === "bet") startBet();
    if (command === "portfolio") showPortfolio();
  });
});

document.querySelector("#connectWallet").addEventListener("click", connectWallet);
document.querySelector("#showMarkets").addEventListener("click", showMarkets);
document.querySelector("#showPortfolio").addEventListener("click", showPortfolio);
document.querySelector("#resetDemo").addEventListener("click", () => {
  state.connected = false;
  state.wallet = null;
  state.balance = 125;
  state.positions = [];
  state.selected = markets[0];
  state.bet = { side: "YES", amount: 25 };
  updateChrome();
  setActiveCommand("markets");
  showStart();
});

updateChrome();
showStart();
