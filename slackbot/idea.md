Project Concept: Lark Triage Bot
The Lark Triage Bot is an automated quality assurance bridge that connects customer support or engineering Slack channels directly to your Lark (getlark.ai) autonomous AI testing infrastructure.

When a user or engineer encounters a bug on a web deployment, they tag the Slack bot with a plain-English description of the issue. The bot intercepts this text, maps it to a headless browser test suite via the local Lark CLI, executes an end-to-end user story simulation, and reports back inside the original Slack thread with a definitive pass/fail verdict and visual screenshot proof.

The Architecture
Plaintext
[Slack App Event (App Mention)] 
       │
       ▼ (Socket Mode WebSocket Connection)
[Local Node.js Engine]
       │
       ▼ (Child Process Shell Execution)
[Lark CLI Tool (lark run)]
       │
       ▼ (Headless Agent Interaction)
[Target Web Application] ──► Generates Test Results & Local `./output/screenshot.png`
       │
       ▼ (Slack Files Web API Upload)
[Original Slack Thread Update with Status & Artifact]
Key Technical Decisions
Slack Socket Mode: Bypasses public tunneling frameworks completely. The application communicates with Slack over a local WebSocket, removing deployment friction.

Decoupled Automation: The server treats the incoming Slack prompt as a direct parameter passed into a child shell execution of lark run, allowing Lark's native AI model to handle layout interpretation and browser control.

🤖 Part 2: Machine-Readable Engineering Spec
1. External Infrastructure Configuration
Slack App Manifest Spec
Paste this YAML block directly into the App Manifest window within the Slack Developer Management Console ([api.slack.com/apps](https://api.slack.com/apps)) to configure scopes, bot setups, and event handlers securely:

YAML
display_information:
  name: Lark Triage Bot
  description: AI-driven end-to-end issue verification tool powered by getlark.ai
  background_color: "#1e1e2e"
features:
  bot_user:
    display_name: Lark Bot
    always_online: true
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - chat:write
      - files:write
settings:
  interactivity:
    is_enabled: false
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false
Expected Runtime Environment
Bash
# System Prerequisites
node --version # Must be >= v18.0.0
lark --version # Must be installed locally and validated via 'lark login'

# System Environment Variables
SLACK_BOT_TOKEN="xoxb-your-bot-token"
SLACK_APP_TOKEN="xapp-your-socket-mode-app-token"
TARGET_APP_URL="https://your-staging-or-preview-app.com"
2. Implementation Blueprint (index.js)
This code template provides the foundational state machine loop, child execution bridge, and artifact post-processing logic.

JavaScript
const { App } = require('@slack/bolt');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Initialize the Slack Bolt client inside Socket Mode
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

// Ensure local image cache artifact directory exists dynamically
const artifactDirectory = path.join(__dirname, 'output');
if (!fs.existsSync(artifactDirectory)) {
  fs.mkdirSync(artifactDirectory, { recursive: true });
}

// Intercept incoming app mention payloads
app.event('app_mention', async ({ event, client }) => {
  const channelId = event.channel;
  const threadTimestamp = event.ts;
  
  // Sanitize the text input by stripping out the raw bot user tag pattern
  const userReportedIssue = event.text.replace(/<@.*?>/, '').trim();
  const targetApplicationUrl = process.env.TARGET_APP_URL || "https://example.com";

  if (!userReportedIssue) {
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: threadTimestamp,
      text: "⚠️ Please provide a clear natural language description of the bug you want me to verify."
    });
    return;
  }

  // 1. Send immediate validation receipt acknowledgment to the user
  await client.chat.postMessage({
    channel: channelId,
    thread_ts: threadTimestamp,
    text: `⏳ **Lark AI Agent Sparked:** Initializing an autonomous user session to reproduce: _"${userReportedIssue}"_...`
  });

  // 2. Format shell command payload safely to call the Lark CLI
  const screenshotPath = path.join(artifactDirectory, `snap_${threadTimestamp}.png`);
  const larkCommand = `lark run ${targetApplicationUrl} --prompt "${userReportedIssue.replace(/"/g, '\\"')}" --screenshot-dir ${artifactDirectory}`;

  // 3. Spawning background shell subprocess transaction
  exec(larkCommand, async (execError, stdout, stderr) => {
    let testPassed = true;
    let runStatusHeadline = "✅ **Lark Verification Passed:** The workflow executed without encountering anomalies or breaking states.";
    
    if (execError) {
      testPassed = false;
      runStatusHeadline = "❌ **Lark Verification Failed:** Automated browser agents replicated the reported issue successfully.";
      console.error(`Lark execution lifecycle logging trace: ${stderr || execError.message}`);
    }

    // Attempt to locate standard visual evidence generated by the run
    const defaultScreenshotLoc = path.join(artifactDirectory, 'screenshot.png');
    let fallbackToLatest = false;

    if (fs.existsSync(defaultScreenshotLoc)) {
      fs.renameSync(defaultScreenshotLoc, screenshotPath);
    } else {
      fallbackToLatest = true;
    }

    try {
      // 4. Return results directly inside the originating Slack thread boundary
      if (fs.existsSync(screenshotPath) || fallbackToLatest) {
        const fileToUpload = fallbackToLatest ? defaultScreenshotLoc : screenshotPath;
        
        await client.files.uploadV2({
          channel_id: channelId,
          thread_ts: threadTimestamp,
          file: fileToUpload,
          initial_comment: runStatusHeadline
        });

        // Safe cleanup optimization
        if (fs.existsSync(fileToUpload)) {
          fs.unlinkSync(fileToUpload);
        }
      } else {
        // Fallback message state if visual rendering drivers fail inside the container runtime
        await client.chat.postMessage({
          channel: channelId,
          thread_ts: threadTimestamp,
          text: `${runStatusHeadline}\n_(Note: Visual interface snapshot asset could not be initialized by the underlying runtime environment.)_`
        });
      }
    } catch (slackApiError) {
      console.error(`Fatal API boundary exception throwing back to thread: ${slackApiError.message}`);
    }
  });
});

// Primary runtime startup lifecycle sequence
(async () => {
  try {
    await app.start();
    console.log('⚡ Lark Triage Engine initialized securely via Slack Socket Mode.');
  } catch (initializationFailure) {
    console.error(`Fatal crash preventing engine bootstrap: ${initializationFailure.message}`);
    process.exit(1);
  }
})();
3. Verification & Validation Protocol
To confirm the application is fully functional, run through the following test sequence:

Verification Setup: Deliberately comment out or break an active element on your target preview staging site (e.g., set a login button visibility property to hidden, or break a signup submission handler route).

Trigger Test: Go to an active channel in your Slack workspace where the bot is installed and mention it with the specific failure string:

@LarkBot Try to click the sign-in link, enter an email, and verify that the user dashboard initializes successfully.

Expected Output: The bot should immediately spin up a thread acknowledgment. Within 30–60 seconds, it should respond with a failure notification accompanied by an uploaded screenshot showing the broken UI state.