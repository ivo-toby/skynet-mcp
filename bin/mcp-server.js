#!/usr/bin/env node
/* eslint-disable no-undef */

async function main() {
  // Find the management token argument

  //const appIdIndex = process.argv.findIndex((arg) => arg === "--app-id")
  //if (appIdIndex !== -1 && process.argv[appIdIndex + 1]) {
  //  process.env.APP_ID = process.argv[appIdIndex + 1]
  //}
  //
  // Import and run the bundled server after env var is set
  await import('../dist/bundle.js');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
