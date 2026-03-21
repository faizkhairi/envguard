import { ScanResult } from './scanner'
import { EnvFile } from './parser'

export interface AuditIssue {
  type: 'missing' | 'unused' | 'undocumented' | 'empty'
  variable: string
  detail: string
}

export interface AuditResult {
  issues: AuditIssue[]
  summary: {
    codeVars: number
    envVars: number
    exampleVars: number
    missing: number
    unused: number
    undocumented: number
    empty: number
  }
}

/**
 * Audit environment variables for issues.
 *
 * - missing: referenced in code but not in .env.example
 * - unused: in .env.example but never referenced in code
 * - undocumented: in .env but not in .env.example
 * - empty: defined in .env but with no value
 */
export function audit(
  scan: ScanResult,
  primaryEnv: EnvFile | undefined,
  exampleEnv: EnvFile | undefined
): AuditResult {
  const issues: AuditIssue[] = []

  const codeVars = new Set(scan.codeRefs.keys())
  const envVars = primaryEnv?.vars ?? new Map<string, string>()
  const exampleVars = exampleEnv?.vars ?? new Map<string, string>()

  // Missing: referenced in code but not in .env.example
  if (exampleEnv) {
    for (const varName of codeVars) {
      if (!exampleVars.has(varName)) {
        const files = scan.codeRefs.get(varName) || []
        issues.push({
          type: 'missing',
          variable: varName,
          detail: `Referenced in ${files.length} file(s) but not in ${exampleEnv.name}`,
        })
      }
    }
  }

  // Unused: in .env.example but never referenced in code
  if (exampleEnv) {
    for (const varName of exampleVars.keys()) {
      if (!codeVars.has(varName)) {
        issues.push({
          type: 'unused',
          variable: varName,
          detail: `Defined in ${exampleEnv.name} but never referenced in code`,
        })
      }
    }
  }

  // Undocumented: in .env but not in .env.example
  if (primaryEnv && exampleEnv) {
    for (const varName of envVars.keys()) {
      if (!exampleVars.has(varName)) {
        issues.push({
          type: 'undocumented',
          variable: varName,
          detail: `Defined in ${primaryEnv.name} but not documented in ${exampleEnv.name}`,
        })
      }
    }
  }

  // Empty: defined in .env but with no value
  if (primaryEnv) {
    for (const [varName, value] of envVars.entries()) {
      if (value === '') {
        issues.push({
          type: 'empty',
          variable: varName,
          detail: `Defined in ${primaryEnv.name} but has no value`,
        })
      }
    }
  }

  // Sort: missing first, then unused, undocumented, empty
  const order = { missing: 0, unused: 1, undocumented: 2, empty: 3 }
  issues.sort((a, b) => order[a.type] - order[b.type] || a.variable.localeCompare(b.variable))

  return {
    issues,
    summary: {
      codeVars: codeVars.size,
      envVars: envVars.size,
      exampleVars: exampleVars.size,
      missing: issues.filter((i) => i.type === 'missing').length,
      unused: issues.filter((i) => i.type === 'unused').length,
      undocumented: issues.filter((i) => i.type === 'undocumented').length,
      empty: issues.filter((i) => i.type === 'empty').length,
    },
  }
}
