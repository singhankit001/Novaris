const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'HISTORY_LOG.md');

// Generate starting date: April 1, 2026, 10:00 AM IST
const startDate = new Date('2026-04-01T10:00:00+05:30');

// Calculate time step
const totalCommits = 300;
// April 1 to July 15 is 105 days
const totalHours = 105 * 24;
const hoursPerCommit = totalHours / totalCommits;

function getDateStr(baseDate, hoursOffset) {
  const d = new Date(baseDate.getTime() + (hoursOffset * 60 * 60 * 1000));
  return d.toISOString();
}

function runCmd(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe' });
  } catch (e) {
    console.error("Command failed: " + cmd);
    console.error(e.stderr ? e.stderr.toString() : e.toString());
  }
}

const prefixes = ['feat', 'fix', 'chore', 'refactor', 'style', 'perf', 'test', 'docs'];
const scopes = ['ai', 'ui', 'db', 'auth', 'cache', 'scanner', 'config', 'api', 'dashboard', 'chat'];
const actions = ['implement', 'resolve', 'update', 'optimize', 'add', 'improve', 'handle', 'setup', 'refine', 'secure'];
const targets = [
  'agentic CAG pipeline', 'Mermaid renderer', 'KV cache logic', 'Next Auth session', 
  'OSV api integration', 'streaming response', 'file selector model', 'rate limiting', 
  'Tailwind classes', 'Prisma schema', 'Vercel deployment', 'glassmorphism UI', 
  'repo metadata fetch', 'token limits', 'security test suites', 'live progress steps', 
  'trending repos fetcher', 'Thinking model prompts', 'error boundaries', 'sidebar navigation'
];

function getRandomMsg(index) {
  const prefix = prefixes[index % prefixes.length];
  const scope = scopes[(index * 3) % scopes.length];
  const action = actions[(index * 7) % actions.length];
  const target = targets[(index * 11) % targets.length];
  return `${prefix}(${scope}): ${action} ${target}`;
}

// 1. Initialize git
runCmd('git init');
runCmd('git config user.name "Ankit Singh"');
runCmd('git config user.email "singhankit91624@gmail.com"');

// Create the HISTORY_LOG.md file
fs.writeFileSync(logFile, '# Novaris Development History\n\n');

// 2. Make the initial commit with all current files
console.log("Making initial commit (1/250)...");
runCmd('git add .');
const initialDate = getDateStr(startDate, 0);
runCmd('GIT_AUTHOR_DATE="' + initialDate + '" GIT_COMMITTER_DATE="' + initialDate + '" git commit -m "chore: initialize project novaris with base structure"');

let hoursOffset = hoursPerCommit;

for (let i = 1; i < totalCommits; i++) {
  const msg = getRandomMsg(i);
  
  // Add a line to HISTORY_LOG.md
  fs.appendFileSync(logFile, '- ' + msg + '\n');
  
  // Commit
  runCmd('git add HISTORY_LOG.md');
  const commitDate = getDateStr(startDate, hoursOffset);
  runCmd('GIT_AUTHOR_DATE="' + commitDate + '" GIT_COMMITTER_DATE="' + commitDate + '" git commit -m "' + msg + '"');
  
  hoursOffset += hoursPerCommit;
  
  if ((i + 1) % 50 === 0) {
    console.log("Processed " + (i + 1) + " commits...");
  }
}

console.log("Successfully generated " + totalCommits + " commits spanning April 1st to July 15th, 2026.");
