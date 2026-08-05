#!/usr/bin/env node
const { installClaudeStatusLine } = require("../src/main/claude-statusline-installer");

installClaudeStatusLine()
  .then((result) => {
    console.log("Claude statusLine 설정 완료");
    console.log(`script: ${result.scriptPath}`);
    console.log(`settings: ${result.settingsPath}`);
    console.log(`command: ${result.command}`);
  })
  .catch((err) => {
    console.error(`Claude statusLine 설정 실패: ${err.message}`);
    process.exitCode = 1;
  });
