import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const SCAN_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.vue', '.svelte', '.astro',
  '.py', '.rb', '.go', '.rs', '.java', '.kt',
  '.yaml', '.yml', '.toml',
])

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.output', '.nuxt', '.next',
  'coverage', '.turbo', '.cache', 'vendor', '__pycache__',
])

// Patterns to extract env var names from source code
const ENV_PATTERNS: RegExp[] = [
  // JavaScript/TypeScript: process.env.VAR_NAME or process.env['VAR_NAME'] or process.env["VAR_NAME"]
  /process\.env\.([A-Z][A-Z0-9_]*)/g,
  /process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g,
  // Vite/Nuxt: import.meta.env.VAR_NAME
  /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
  // Deno: Deno.env.get('VAR_NAME')
  /Deno\.env\.get\(['"]([A-Z][A-Z0-9_]*)['"]\)/g,
  // Python: os.environ['VAR_NAME'] or os.getenv('VAR_NAME') or os.environ.get('VAR_NAME')
  /os\.environ\[['"]([A-Z][A-Z0-9_]*)['"]\]/g,
  /os\.(?:getenv|environ\.get)\(['"]([A-Z][A-Z0-9_]*)['"]/g,
  // Docker/YAML: ${VAR_NAME} (only in yaml/yml/toml)
  /\$\{([A-Z][A-Z0-9_]*)\}/g,
  // Go: os.Getenv("VAR_NAME")
  /os\.Getenv\(['"]([A-Z][A-Z0-9_]*)['"]\)/g,
]

// Built-in env vars to ignore (not user-defined)
const BUILTIN_VARS = new Set([
  'NODE_ENV', 'PATH', 'HOME', 'USER', 'SHELL', 'TERM', 'LANG',
  'PWD', 'HOSTNAME', 'PORT', 'HOST', 'CI', 'TZ',
  'npm_lifecycle_event', 'npm_package_name', 'npm_package_version',
])

export interface ScanResult {
  /** Env vars referenced in source code, mapped to file locations */
  codeRefs: Map<string, string[]>
}

export function scanDirectory(dir: string, ignoreBuiltins = true): ScanResult {
  const codeRefs = new Map<string, string[]>()

  function walk(currentDir: string): void {
    let entries: string[]
    try {
      entries = readdirSync(currentDir)
    } catch {
      return
    }

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry)) continue
      if (entry.startsWith('.') && entry !== '.env') continue

      const fullPath = join(currentDir, entry)
      let stat
      try {
        stat = statSync(fullPath)
      } catch {
        continue
      }

      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (stat.isFile() && SCAN_EXTENSIONS.has(extname(entry))) {
        scanFile(fullPath, codeRefs)
      }
    }
  }

  walk(dir)

  if (ignoreBuiltins) {
    for (const builtin of BUILTIN_VARS) {
      codeRefs.delete(builtin)
    }
  }

  return { codeRefs }
}

function scanFile(filePath: string, refs: Map<string, string[]>): void {
  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch {
    return
  }

  for (const pattern of ENV_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = pattern.exec(content)) !== null) {
      const varName = match[1]
      if (!varName) continue

      const existing = refs.get(varName) || []
      if (!existing.includes(filePath)) {
        existing.push(filePath)
      }
      refs.set(varName, existing)
    }
  }
}
