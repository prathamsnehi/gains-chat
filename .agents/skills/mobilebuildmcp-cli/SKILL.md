---
name: mobilebuildmcp-cli
description: Official skill for the MobileBuildMCP CLI. Use when doing iOS/macOS/watchOS/tvOS/visionOS work (build, test, run, debug, log, UI automation).
---

# MobileBuildMCP CLI

Use MobileBuildMCP tools via the `mobilebuildmcp` executable instead of raw `xcodebuild`, `xcrun`, or `simctl`.

## Step 1: Ensure the CLI Exists

Check availability:
```bash
mobilebuildmcp --help
```

If missing, install with one of:
```bash
brew tap getsentry/xcodebuildmcp
brew install mobilebuildmcp
```

```bash
npm install -g mobilebuildmcp@latest
```

Re-check after install:
```bash
mobilebuildmcp --help
```

## Step 2: Skip discovery when defaults exist

If `.mobilebuildmcp/config.yaml` already has `sessionDefaults.projectPath`, `scheme`, and `simulatorId`, do not run `--help`, `tools`, `simulator list`, or `discover-projects`. Run the one command:

```bash
mobilebuildmcp simulator build-and-run
```

Run it outside the sandbox. CoreSimulator refuses connections from a sandboxed shell, and a failed list costs a full extra turn. Do not take a screenshot unless the user asked to see the screen.

Use `--help` only when that command fails or the needed tool is not named above.

## Step 3: Keep Execution Minimal

- Choose the smallest command sequence that satisfies the request.
- Prefer direct workflow commands over manual multi-step chains unless explicitly requested.
- For simulator run intent, prefer the combined `build-and-run` command.
- Do not chain `build` then `build-and-run` unless explicitly requested.

## Capability Overview

`mobilebuildmcp` supports:
- simulator and device build/test/run
- debugging and log capture
- UI automation
- project discovery and scaffolding
- session defaults and workflow configuration

## Exit Criteria

- CLI presence is verified or installation steps are provided.
- Commands are discovered via `--help` / `tools`.
- Session defaults are checked before first build/run/test action.
