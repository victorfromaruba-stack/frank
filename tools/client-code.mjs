// A client code for one of Frank's clients: typing it on "Frank's clients" opens the whole app
// without the membership. Prints the line to add to FRANK.codes in js/programs.js.
// --coach: Frank's own coach code instead. Typed on Frank > "Frank? Open coach tools", it opens Coach tools on
// that phone. Prints the line for FRANK.coachCodes. A new coach code locks every phone that had the old one.
// The repo keeps only the hash, so the code itself isn't readable there. Capitals and spaces don't count.
// Run: node tools/client-code.mjs <code>   or   node tools/client-code.mjs --coach <code>
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const coach = args.includes('--coach');
const code = args.filter((a) => a !== '--coach').join('').trim().toLowerCase().replace(/\s+/g, '');
if (!/^[a-z0-9-]{3,40}$/.test(code)) {
  console.error('A code is 3 to 40 letters, digits or dashes.');
  process.exit(1);
}
// the hash is public: a short coach code could be found from it by trying every code
if (coach && code.length < 12) {
  console.error('A coach code opens Coach tools: make it at least 12 letters, digits or dashes.');
  process.exit(1);
}
console.log(`'${createHash('sha256').update((coach ? 'wbf-coach:' : 'wbf:') + code).digest('hex')}',`);
