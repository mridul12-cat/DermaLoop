import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
let loaderErrors = 0;
const envModule = await import('@next/env');
const loadEnv = envModule.loadEnvConfig ?? envModule.default?.loadEnvConfig;
loadEnv(process.cwd(), process.env.NODE_ENV !== 'production', { info() {}, error() { loaderErrors++; } }, true);
const staged = process.argv.includes('--staged');
const files = execFileSync('git', staged ? ['diff','--cached','--name-only','-z'] : ['ls-files','-z'], {encoding:'utf8'}).split('\0').filter(Boolean);
const sensitive = (f) => /(^|\/)(\.private|node_modules|\.next|\.vercel|test-results|playwright-report|coverage)(\/|$)/i.test(f) || /(^|\/)\.env(?!\.example$)/i.test(f) || /\.(png|jpe?g|webp|heic|gif|pem|key|p12|zip|pdf)$/i.test(f) || /(^|\/)docs\/screenshots\//.test(f) || /credentials.*\.json$/i.test(f) || /\.tsbuildinfo$/.test(f);
let blocked = 0;
for (const file of files) {
  if (sensitive(file)) { blocked++; continue; }
  let text;
  try { text = staged ? execFileSync('git',['show',`:${file}`],{encoding:'utf8'}) : fs.readFileSync(file,'utf8'); } catch { continue; }
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/.test(text)) blocked++;
}
const liveOff = !process.env.YOUCAM_LIVE_ENABLED || process.env.YOUCAM_LIVE_ENABLED === 'false';
const hardOff = /export const PUBLIC_PROVIDER_ACCESS = false/.test(fs.readFileSync('src/lib/public-demo.ts','utf8'));
console.log(JSON.stringify({gitFilesChecked:files.length,blockedFileCount:blocked,publicLiveDisabled:liveOff,publicRoutesHardDisabled:hardOff,result:blocked===0&&liveOff&&hardOff&&loaderErrors===0?'PASS':'FAIL'}));
if(blocked || !liveOff || !hardOff || loaderErrors) process.exitCode=1;
