const blessed = require('blessed');
const contrib = require('blessed-contrib');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Initialize the terminal screen
const screen = blessed.screen({ smartCSR: true, title: 'Lark Test Orchestrator' });
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

// 1. Header Box for Current Workflow Summary
const headerBox = grid.set(0, 0, 3, 12, blessed.box, {
  label: ' {bold}🚀 LARK TUI{/bold} | Workflow Orchestrator ',
  border: { type: "line", fg: "magenta" },
  tags: true,
  align: 'center',
  valign: 'middle'
});

// 2. Details Area
const detailsBox = grid.set(3, 0, 8, 6, blessed.box, {
  label: ' Workflow Details & Output ',
  border: { type: "line", fg: "magenta" },
  tags: true,
  padding: { left: 1, right: 1, top: 1 }
});

// 3. Notes Area
const notesBox = grid.set(3, 6, 8, 6, blessed.box, {
  label: ' Context & Notes ',
  border: { type: "line", fg: "black", bg: "yellow" },
  style: { bg: 'yellow', fg: 'black' },
  tags: true,
  padding: { left: 1, right: 1, top: 1 }
});

// 4. Footer instruction bar
const footer = grid.set(11, 0, 1, 12, blessed.box, {
  content: ' {bold}[◄ / ►]{/bold} Switch  |  {bold}[C]{/bold} Create  |  {bold}[R]{/bold} Run  |  {bold}[N]{/bold} Notes  |  {bold}[L]{/bold} Logs  |  {bold}[Q]{/bold} Quit ',
  tags: true,
  style: { fg: 'black', bg: 'magenta' },
  align: 'center'
});

// 5. Hidden Log Modal Window
const logWindow = grid.set(2, 2, 8, 8, contrib.log, {
  fg: "lightgray",
  selectedFg: "white",
  label: ' AI Agent Logs (Press L to close) ',
  border: { type: "line", fg: "magenta" }
});
logWindow.hide();

// 6. Hidden Note Editor Modal
const noteEditor = grid.set(3, 3, 6, 6, blessed.textarea, {
  label: ' Edit Notes (Press Esc to Save) ',
  border: { type: "line", fg: "black", bg: "yellow" },
  style: { fg: 'black', bg: 'yellow', border: { fg: 'black', bg: 'yellow' } },
  inputOnFocus: true
});
noteEditor.hide();

// 7. Workflow Creation Wizard (Modal)
const createModal = blessed.box({
  parent: screen,
  top: 'center', left: 'center', width: 60, height: 12,
  border: { type: 'line', fg: 'black', bg: 'magenta' },
  label: ' 🪄 Create New Lark Workflow ',
  tags: true, hidden: true,
  style: { bg: 'magenta', fg: 'black' }
});

blessed.text({ parent: createModal, top: 1, left: 2, content: 'Workflow Name:', style: { bg: 'magenta', fg: 'black' } });
const nameInput = blessed.textbox({
  parent: createModal, top: 2, left: 2, width: 54, height: 1,
  inputOnFocus: true,
  style: { bg: 'black', fg: 'white', focus: { bg: 'white', fg: 'black' } }
});

blessed.text({ parent: createModal, top: 4, left: 2, content: 'Description (AI Instructions):', style: { bg: 'magenta', fg: 'black' } });
const descInput = blessed.textbox({
  parent: createModal, top: 5, left: 2, width: 54, height: 1,
  inputOnFocus: true,
  style: { bg: 'black', fg: 'white', focus: { bg: 'white', fg: 'black' } }
});

blessed.text({
  parent: createModal, top: 8, left: 2,
  content: '{black-fg}[Enter] Next / Submit   |   [Esc] Cancel{/black-fg}', tags: true,
  style: { bg: 'magenta', fg: 'black' }
});

// --- MOCK DATA SIMULATION ---

// Check Authentication Status
const configPath = path.join(os.homedir(), '.getlark', 'config.json');
const isAuthenticated = fs.existsSync(configPath);
const authStatus = isAuthenticated ? '{green-fg}Authenticated (getlark.ai){/green-fg}' : '{red-fg}Offline / Unauthenticated{/red-fg}';

const mockWorkflows = [
  {
    name: 'User Login & Auth', status: '{green-fg}PASSED{/green-fg}', duration: '45s',
    details: '{bold}Target URL:{/bold} https://staging.app.com/login\n{bold}Agent:{/bold} Lark DOM Engine\n\n{underline}Execution Steps:{/underline}\n1. Fill credentials (Passed)\n2. Bypass Captcha (Passed)\n3. Verify dashboard token (Passed)',
    notes: 'This is a mocked workflow and has no real command attached.',
    isReal: false
  },
  {
    name: 'Stripe Webhook Hook', status: '{red-fg}FAILED{/red-fg}', duration: '15s',
    details: '{bold}Target URL:{/bold} /api/webhooks/stripe\n{bold}Agent:{/bold} Lark Network Proxy\n\n{underline}Execution Steps:{/underline}\n1. Send mock 500 error payload (Passed)\n2. Verify fallback UI (Failed)\n\n{red-fg}Assertion Error:{/red-fg} Expected error toast to appear, but page crashed.',
    notes: 'This is also a mocked workflow. Pressing R will show a system message.',
    isReal: false
  }
];

let workflows = [...mockWorkflows];
let currentIndex = 0;
let isEditingNotes = false;
let isCreating = false;

function renderCurrentWorkflow() {
  const wf = workflows[currentIndex];
  const badge = wf.isReal ? '{green-bg}{black-fg} REAL {/black-fg}{/green-bg}' : '{yellow-bg}{black-fg} MOCK {/black-fg}{/yellow-bg}';
  
  headerBox.setContent(`{right}API: ${authStatus}{/right}\n{bold}${badge} Workflow:{/bold} ${wf.name}   |   Status: ${wf.status}   |   Queue: ${currentIndex + 1}/${workflows.length}`);
  detailsBox.setContent(wf.details);
  notesBox.setContent(wf.notes || '{black-fg}No context notes available.{/black-fg}');
}

renderCurrentWorkflow();

// Fetch Logic wrapped in a reusable function
function fetchRemoteWorkflows() {
  if (!isAuthenticated) return;
  exec('getlark workflows list', (error, stdout, stderr) => {
    let fetchedWorkflows = [];
    
    if (error || stderr) {
      fetchedWorkflows.push({
        name: '⚠️ Fetch Error', status: '{red-fg}ERROR{/red-fg}', duration: '-',
        details: `{bold}Failed to execute CLI:{/bold}\n\n${(error ? error.message : stderr).trim()}`,
        notes: 'Check your terminal environment variables.', isReal: false
      });
    } else if (stdout) {
      try {
        const data = JSON.parse(stdout);
        if (data && data.workflows) {
          data.workflows.forEach(wf => {
            let statusText = '{cyan-fg}READY{/cyan-fg}';
            if (wf.display_status === 'success') statusText = '{green-fg}PASSED{/green-fg}';
            if (wf.display_status === 'failure') statusText = '{red-fg}FAILED{/red-fg}';
            if (wf.status === 'generating') statusText = '{yellow-fg}GENERATING{/yellow-fg}';
            
            let durationStr = '-';
            if (wf.last_execution_started_at && wf.last_execution_stopped_at) {
              durationStr = ((new Date(wf.last_execution_stopped_at) - new Date(wf.last_execution_started_at)) / 1000).toFixed(1) + 's';
            }
            
            fetchedWorkflows.push({
              name: `☁️  ${wf.name}`, status: statusText, duration: durationStr,
              details: `{bold}Workflow ID:{/bold} ${wf.id}\n{bold}Mode:{/bold} ${wf.mode}\n\n{underline}Description:{/underline}\n${wf.description || 'No description provided.'}\n\n{underline}Last Run:{/underline}\n${wf.last_execution_started_at || 'Never'}`,
              notes: 'This is a REAL workflow. Press R to execute it against getlark.ai!',
              command: `getlark workflows invoke --workflow-ids ${wf.id} --wait --verbose`,
              isReal: true
            });
          });
        }
      } catch (e) {}

      if (fetchedWorkflows.length === 0) {
        fetchedWorkflows.push({
          name: 'ℹ️ No Remote Workflows Found', status: '{yellow-fg}EMPTY{/yellow-fg}', duration: '-',
          details: `{bold}We checked getlark.ai, but you have no workflows yet!{/bold}\n\nPress C to create one right now!`,
          notes: 'Try creating a workflow to see the UI update instantly.', isReal: false
        });
      }
    }
    
    workflows = [...fetchedWorkflows, ...mockWorkflows];
    currentIndex = 0;
    renderCurrentWorkflow();
    screen.render();
  });
}

fetchRemoteWorkflows();

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

// Populate logs statically so it is not overwhelming
fakeLogs.forEach(l => logWindow.log(`[${new Date().toISOString().split('T')[1].slice(0,-1)}] ${l}`));

// Event listener for toggling the log window
let logsVisible = false;
screen.key(['l', 'L'], () => {
  if (isEditingNotes || isCreating) return;
  logsVisible = !logsVisible;
  if (logsVisible) {
    logWindow.show();
    logWindow.setFront();
  } else {
    logWindow.hide();
  }
  screen.render();
});

// Navigation and Interaction keys
screen.key(['left'], () => {
  if (isEditingNotes || logsVisible || isCreating) return;
  currentIndex = (currentIndex > 0) ? currentIndex - 1 : workflows.length - 1;
  renderCurrentWorkflow();
  screen.render();
});

screen.key(['right'], () => {
  if (isEditingNotes || logsVisible || isCreating) return;
  currentIndex = (currentIndex < workflows.length - 1) ? currentIndex + 1 : 0;
  renderCurrentWorkflow();
  screen.render();
});

screen.key(['n', 'N'], () => {
  if (isEditingNotes || logsVisible || isCreating) return;
  isEditingNotes = true;
  noteEditor.setValue(workflows[currentIndex].notes);
  noteEditor.show();
  noteEditor.focus();
  screen.render();
});

noteEditor.key(['escape'], () => {
  workflows[currentIndex].notes = noteEditor.getValue().trim();
  isEditingNotes = false;
  noteEditor.hide();
  renderCurrentWorkflow();
  screen.render();
});

// --- CREATE WIZARD LOGIC ---
screen.key(['c', 'C'], () => {
  if (isEditingNotes || logsVisible || isCreating) return;
  isCreating = true;
  nameInput.clearValue();
  descInput.clearValue();
  createModal.show();
  createModal.setFront();
  nameInput.focus();
  screen.render();
});

nameInput.key(['escape'], () => { isCreating = false; createModal.hide(); screen.render(); });
descInput.key(['escape'], () => { isCreating = false; createModal.hide(); screen.render(); });

nameInput.on('submit', () => { descInput.focus(); screen.render(); });

descInput.on('submit', () => {
  const name = nameInput.getValue().trim().replace(/"/g, '\\"');
  const desc = descInput.getValue().trim().replace(/"/g, '\\"');
  isCreating = false;
  createModal.hide();
  
  if (!name || !desc) { screen.render(); return; }
  
  if (!logsVisible) { logsVisible = true; logWindow.show(); logWindow.setFront(); }
  logWindow.log(`\n{bold}--- 🪄 CREATING NEW WORKFLOW ---{/bold}`);
  logWindow.log(`> getlark workflows create --name "${name}" --description "${desc}"\n`);
  screen.render();
  
  exec(`getlark workflows create --name "${name}" --description "${desc}"`, (err, stdout, stderr) => {
    if (err || stderr) {
      logWindow.log(`{red-fg}Error: ${err ? err.message : stderr}{/red-fg}`);
    } else {
      logWindow.log(`{green-fg}Successfully created workflow in getlark.ai!{/green-fg}`);
      fetchRemoteWorkflows(); // Refresh list to show the new workflow instantly!
    }
    screen.render();
  });
});

screen.key(['r', 'R'], () => {
  if (isEditingNotes || isCreating) return;
  const wf = workflows[currentIndex];
  
  if (!wf.command) {
    logWindow.log(`\n[System] No real CLI command configured for mocked workflow: ${wf.name}`);
    if (!logsVisible) { logsVisible = true; logWindow.show(); logWindow.setFront(); }
    screen.render();
    return;
  }

  wf.status = '{yellow-fg}EXECUTING CLI...{/yellow-fg}';
  renderCurrentWorkflow();
  
  logWindow.log(`\n{bold}--- STARTING REAL LARK CLI ---{/bold}`);
  logWindow.log(`> ${wf.command}\n`);
  
  // Auto-show logs when a real test runs
  if (!logsVisible) {
    logsVisible = true;
    logWindow.show();
    logWindow.setFront();
  }
  screen.render();

  const child = exec(wf.command);
  
  child.stdout.on('data', (data) => {
    logWindow.log(data.toString().trim());
    screen.render();
  });

  child.stderr.on('data', (data) => {
    logWindow.log(`{red-fg}${data.toString().trim()}{/red-fg}`);
    screen.render();
  });

  child.on('close', (code) => {
    wf.status = code === 0 ? '{green-fg}PASSED{/green-fg}' : '{red-fg}FAILED{/red-fg}';
    logWindow.log(`\n{bold}--- LARK CLI EXITED (Code: ${code}) ---{/bold}`);
    renderCurrentWorkflow();
    screen.render();
  });
});

screen.key(['q', 'C-c'], () => {
  if (!isEditingNotes && !isCreating) process.exit(0);
});
screen.render();