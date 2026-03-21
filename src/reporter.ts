import { AuditResult, AuditIssue } from './audit'

const COLORS = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
}

const ICONS: Record<AuditIssue['type'], string> = {
  missing: `${COLORS.red}x${COLORS.reset}`,
  unused: `${COLORS.yellow}!${COLORS.reset}`,
  undocumented: `${COLORS.cyan}?${COLORS.reset}`,
  empty: `${COLORS.dim}-${COLORS.reset}`,
}

const LABELS: Record<AuditIssue['type'], string> = {
  missing: `${COLORS.red}MISSING${COLORS.reset}`,
  unused: `${COLORS.yellow}UNUSED${COLORS.reset}`,
  undocumented: `${COLORS.cyan}UNDOCUMENTED${COLORS.reset}`,
  empty: `${COLORS.dim}EMPTY${COLORS.reset}`,
}

export function reportText(result: AuditResult): string {
  const lines: string[] = []
  const { summary } = result

  lines.push('')
  lines.push(`${COLORS.bold}envguard${COLORS.reset} - Environment Variable Audit`)
  lines.push('')

  // Summary line
  lines.push(
    `  Scanned: ${COLORS.bold}${summary.codeVars}${COLORS.reset} vars in code, ` +
    `${COLORS.bold}${summary.envVars}${COLORS.reset} in .env, ` +
    `${COLORS.bold}${summary.exampleVars}${COLORS.reset} in .env.example`
  )
  lines.push('')

  if (result.issues.length === 0) {
    lines.push(`  ${COLORS.green}All environment variables are in sync.${COLORS.reset}`)
    lines.push('')
    return lines.join('\n')
  }

  // Group by type
  const groups = new Map<AuditIssue['type'], AuditIssue[]>()
  for (const issue of result.issues) {
    const existing = groups.get(issue.type) || []
    existing.push(issue)
    groups.set(issue.type, existing)
  }

  for (const [type, issues] of groups) {
    lines.push(`  ${LABELS[type]} (${issues.length})`)
    for (const issue of issues) {
      lines.push(`    ${ICONS[type]} ${COLORS.bold}${issue.variable}${COLORS.reset}  ${COLORS.dim}${issue.detail}${COLORS.reset}`)
    }
    lines.push('')
  }

  // Footer
  const total = result.issues.length
  const hasErrors = summary.missing > 0
  const color = hasErrors ? COLORS.red : COLORS.yellow
  lines.push(`  ${color}${total} issue(s) found${COLORS.reset}`)
  lines.push('')

  return lines.join('\n')
}

export function reportJSON(result: AuditResult): string {
  return JSON.stringify(
    {
      summary: result.summary,
      issues: result.issues,
    },
    null,
    2
  )
}
