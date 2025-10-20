import fs from 'fs';
import path from 'path';
import { computeFileHash } from '../utils/hashHelpers.js';

function bufferFromString(s) {
  return Buffer.from(s, 'utf8');
}

async function run() {
  const sample = bufferFromString('hello world');

  const userA = 'userA-123';
  const userB = 'userB-456';

  const hashA1 = computeFileHash(sample, userA);
  const hashA2 = computeFileHash(sample, userA);
  const hashB = computeFileHash(sample, userB);
  const hashNoSalt = computeFileHash(sample);

  console.log('hashA1:', hashA1);
  console.log('hashA2:', hashA2);
  console.log('hashB :', hashB);
  console.log('noSalt:', hashNoSalt);

  if (hashA1 !== hashA2) {
    console.error('FAIL: same user produced different hashes');
    process.exit(2);
  }
  if (hashA1 === hashB) {
    console.error('FAIL: different users produced the same salted hash');
    process.exit(3);
  }
  if (hashA1 === hashNoSalt) {
    console.error('FAIL: salted hash equals unsalted hash');
    process.exit(4);
  }

  console.log('OK: salted hashing behaves as expected');
}

run().catch(err => {
  console.error('ERROR', err);
  process.exit(1);
});
