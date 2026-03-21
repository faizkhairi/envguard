import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface EnvFile {
  name: string
  path: string
  vars: Map<string, string>
}

const ENV_FILES = [
  '.env',
  '.env.local',
  '.env.example',
  '.env.sample',
  '.env.template',
  '.env.development',
  '.env.staging',
  '.env.production',
  '.env.test',
]

/**
 * Parse a .env file into a map of key-value pairs.
 * Handles comments, empty lines, quotes, and multiline values.
 */
export function parseEnvFile(filePath: string): Map<string, string> {
  const vars = new Map<string, string>()

  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return vars
  }

  const lines = content.split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Skip comments and empty lines
    if (!line || line.startsWith('#')) continue

    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) continue

    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    // Strip inline comments (only if not quoted)
    const commentIndex = value.indexOf(' #')
    if (commentIndex > 0) {
      value = value.slice(0, commentIndex).trim()
    }

    if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
      vars.set(key, value)
    }
  }

  return vars
}

/**
 * Discover and parse all .env files in a directory.
 */
export function discoverEnvFiles(dir: string): EnvFile[] {
  const found: EnvFile[] = []

  for (const name of ENV_FILES) {
    const filePath = join(dir, name)
    if (existsSync(filePath)) {
      found.push({
        name,
        path: filePath,
        vars: parseEnvFile(filePath),
      })
    }
  }

  return found
}

/**
 * Find the "example" env file (.env.example, .env.sample, .env.template).
 */
export function findExampleFile(envFiles: EnvFile[]): EnvFile | undefined {
  return envFiles.find(
    (f) =>
      f.name === '.env.example' ||
      f.name === '.env.sample' ||
      f.name === '.env.template'
  )
}

/**
 * Find the primary .env file.
 */
export function findPrimaryEnv(envFiles: EnvFile[]): EnvFile | undefined {
  return envFiles.find((f) => f.name === '.env' || f.name === '.env.local')
}
