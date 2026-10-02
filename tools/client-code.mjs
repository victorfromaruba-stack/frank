// A client code for one of Frank's clients: typing it on "Frank's clients" opens the whole app
// without the membership. Prints the line to add to FRANK.codes in js/programs.js.
// The repo keeps only the hash, so the code itself isn't readable there. Capitals and spaces don't count.
// Run: node tools/client-code.mjs <code>
import { createHash } from 'node:crypto';

const code = process.argv.slice(2).join('').trim().toLowerCase().replace(/\s+/g, '');
if (!/^[a-z0-9-]{3,40}$/.test(code)) {
  console.error('A code is 3 to 40 letters, digits or dashes.');
  process.exit(1);
}
console.log(`'${createHash('sha256').update('wbf:' + code).digest('hex')}',`);
