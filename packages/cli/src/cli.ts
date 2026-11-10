#!/usr/bin/env node

const command = process.argv[2];

if (command === '--version' || command === '-v') {
  console.log('0.0.0');
} else {
  console.log('simplify <command>');
  console.log('');
  console.log('Commands are not implemented yet.');
}
