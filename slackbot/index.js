const blessed = require('blessed');
const contrib = require('blessed-contrib');

// Initialize the terminal screen
const screen = blessed.screen({ smartCSR: true, title: 'Lark Test Orchestrator' });
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

// 1. Table Widget for Lark Workflows
const table = grid.set(0, 0, 6, 8, contrib.table, {
  keys: true,
  fg: 'white',
  selectedFg: 'white',
  selectedBg: 'blue',
  interactive: true,
  label: ' 🧪 Active Lark Workflows ',
  width: '100%',
  height: '100%',
  border: { type: "line", fg: "cyan" },
  columnSpacing: 5,
  columnWidth: [30, 15, 20]
});

// 2. Log Widget for real-time AI Agent execution output
const log = grid.set(6, 0, 6, 12, contrib.log, {
  fg: "green",
  selectedFg: "green",
  label: ' 📜 Live Lark AI Agent Logs ',
  border: { type: "line", fg: "cyan" }
});

// 3. Gauge Widget for overall test suite pass rate
const gauge = grid.set(0, 8, 3, 4, contrib.gauge, {
  label: ' Global Success Rate ',
  stroke: 'green',
  fill: 'white',
  border: { type: "line", fg: "cyan" }
});

// 4. Bar Chart for test latency
const bar = grid.set(3, 8, 3, 4, contrib.bar, {
  label: ' Execution Latency (ms) ',
  barWidth: 4,
  barSpacing: 2,
  xOffset: 0,
  maxHeight: 9,
  border: { type: "line", fg: "cyan" }
});

// --- MOCK DATA SIMULATION ---

let workflows = [
  ['E2E Checkout Flow', 'RUNNING...', '2m 14s'],
  ['User Login & Auth', 'PASSED', '45s'],
  ['Settings Page Validation', 'PASSED', '1m 02s'],
  ['Stripe Webhook Hook', 'FAILED', '15s'],
  ['Responsive Navbar', 'QUEUED', '-']
];

function updateTable() {
  table.setData({ headers: ['Workflow Name', 'Status', 'Duration'], data: workflows });
}

gauge.setPercent(75);
bar.setData({ titles: ['Auth', 'Cart', 'Setng'], data: [2100, 4500, 1500] });
updateTable();

const fakeLogs = [
  "Spawning headless agent for 'E2E Checkout Flow'...",
  "Navigating to https://staging.app.com/checkout",
  "[Lark AI] Interpreting visual layout of cart...",
  "[Agent] Finding element button#submit-order",
  "DOM loaded in 1.2s... taking snapshot: snap_checkout_1.png",
  "Comparing DOM tree against baseline...",
  "Network request to /api/charge returned 200 OK",
  "Waiting for success modal to appear...",
  "Evaluating assertions: 'Total price should be $45.00'",
  "Assertion matched. Proceeding to next step."
];

let logIndex = 0;
setInterval(() => {
  log.log(`[${new Date().toISOString().split('T')[1].slice(0,-1)}] ${fakeLogs[logIndex]}`);
  logIndex = (logIndex + 1) % fakeLogs.length;
  screen.render();
}, 800);

screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
screen.render();