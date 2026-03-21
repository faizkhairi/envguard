#!/usr/bin/env node

import { resolve } from 'path'
import { scanDirectory } from './scanner'
import { discoverEnvFiles, findExampleFile, findPrimaryEnv } from './parser'
import { audit } from './audit'
import { reportText, reportJSON } from './reporter'

function parseArgs(args: string[]): {
  dir: string
  json: boolean
  help: boolean
  version: boolean
  includeBuiltins: boolean
} {
  let dir = '.'
  let json = false
  let help = false
  let version = false
  let includeBuiltins = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--json':
        json = true
        break
      case '--help':
      case '-h':
        help = true
        break
      case '--version':
      case '-v':
        version = true
        break
      case '--include-builtins':
        includeBuiltins = true
        break
      default:
        if (!arg.startsWith('-')) {
          dir = arg
        }
        break
    }
  }

  return { dir, json, help, version, includeBuiltins }
}

const HELP = `
  envguard - Guard your environment variables

  Usage:
    envguard [directory] [options]

  Options:
    --json               Output results as JSON
    --include-builtins   Include built-in vars (NODE_ENV, PATH, etc.)
    -h, --help           Show this help message
    -v, --version        Show version number

  Examples:
    envguard                    Audit current directory
    envguard ./my-project       Audit a specific project
    envguard --json             Output as JSON (for CI pipelines)

  What it checks:
    MISSING        Referenced in code but not in .env.example
    UNUSED         In .env.example but never referenced in code
    UNDOCUMENTED   In .env but not documented in .env.example
    EMPTY          Defined in .env but has no value

  Exit codes:
    0   No issues (or only warnings)
    1   Missing variables found (code references undocumented vars)
`

function main(): void {
  const opts = parseArgs(process.argv.slice(2))

  if (opts.help) {
    console.log(HELP)
    process.exit(0)
  }

  if (opts.version) {
    try {
      const pkg = require('../package.json')
      console.log(pkg.version)
    } catch {
      console.log('1.0.0')
    }
    process.exit(0)
  }

  const targetDir = resolve(opts.dir)

  // Scan source files for env var references
  const scanResult = scanDirectory(targetDir, !opts.includeBuiltins)

  // Discover and parse .env files
  const envFiles = discoverEnvFiles(targetDir)
  const primaryEnv = findPrimaryEnv(envFiles)
  const exampleEnv = findExampleFile(envFiles)

  // Run audit
  const result = audit(scanResult, primaryEnv, exampleEnv)

  // Output
  if (opts.json) {
    console.log(reportJSON(result))
  } else {
    console.log(reportText(result))

    if (!exampleEnv && !primaryEnv) {
      console.log('  \x1b[2mNo .env or .env.example found. Create a .env.example to enable full auditing.\x1b[0m')
      console.log('')
    }
  }

  // Exit with error if missing vars found
  if (result.summary.missing > 0) {
    process.exit(1)
  }
}

main()
