import { describe, it } from 'node:test'
import * as assert from 'node:assert/strict'
import { resolve } from 'path'
import { scanDirectory } from './scanner'
import { discoverEnvFiles, findExampleFile, findPrimaryEnv, parseEnvFile } from './parser'
import { audit } from './audit'

const FIXTURES = resolve(__dirname, '../test/fixtures')

describe('parseEnvFile', () => {
  it('parses .env file correctly', () => {
    const vars = parseEnvFile(resolve(FIXTURES, '.env'))
    assert.equal(vars.get('DATABASE_URL'), 'postgresql://localhost:5432/mydb')
    assert.equal(vars.get('API_KEY'), 'sk-12345')
    assert.equal(vars.get('JWT_SECRET'), '')
    assert.equal(vars.get('REDIS_URL'), 'redis://localhost:6379')
  })

  it('parses .env.example file correctly', () => {
    const vars = parseEnvFile(resolve(FIXTURES, '.env.example'))
    assert.equal(vars.size, 5)
    assert.ok(vars.has('UNUSED_VAR'))
  })

  it('returns empty map for non-existent file', () => {
    const vars = parseEnvFile('/nonexistent/.env')
    assert.equal(vars.size, 0)
  })
})

describe('scanDirectory', () => {
  it('finds env var references in source files', () => {
    const result = scanDirectory(FIXTURES)
    assert.ok(result.codeRefs.has('DATABASE_URL'))
    assert.ok(result.codeRefs.has('API_KEY'))
    assert.ok(result.codeRefs.has('JWT_SECRET'))
    assert.ok(result.codeRefs.has('SMTP_HOST'))
    assert.ok(result.codeRefs.has('VITE_PUBLIC_URL'))
  })

  it('maps variables to their file locations', () => {
    const result = scanDirectory(FIXTURES)
    const dbFiles = result.codeRefs.get('DATABASE_URL') || []
    assert.ok(dbFiles.length > 0)
    assert.ok(dbFiles[0].includes('app.ts'))
  })
})

describe('audit', () => {
  it('detects missing variables (in code but not in .env.example)', () => {
    const scan = scanDirectory(FIXTURES)
    const envFiles = discoverEnvFiles(FIXTURES)
    const primary = findPrimaryEnv(envFiles)
    const example = findExampleFile(envFiles)

    const result = audit(scan, primary, example)
    const missing = result.issues.filter((i) => i.type === 'missing')

    const missingNames = missing.map((i) => i.variable)
    assert.ok(missingNames.includes('SMTP_HOST'), 'SMTP_HOST should be missing')
    assert.ok(missingNames.includes('VITE_PUBLIC_URL'), 'VITE_PUBLIC_URL should be missing')
  })

  it('detects unused variables (in .env.example but not in code)', () => {
    const scan = scanDirectory(FIXTURES)
    const envFiles = discoverEnvFiles(FIXTURES)
    const primary = findPrimaryEnv(envFiles)
    const example = findExampleFile(envFiles)

    const result = audit(scan, primary, example)
    const unused = result.issues.filter((i) => i.type === 'unused')

    const unusedNames = unused.map((i) => i.variable)
    assert.ok(unusedNames.includes('UNUSED_VAR'), 'UNUSED_VAR should be unused')
  })

  it('detects undocumented variables (in .env but not in .env.example)', () => {
    const scan = scanDirectory(FIXTURES)
    const envFiles = discoverEnvFiles(FIXTURES)
    const primary = findPrimaryEnv(envFiles)
    const example = findExampleFile(envFiles)

    const result = audit(scan, primary, example)
    const undocumented = result.issues.filter((i) => i.type === 'undocumented')

    const undocNames = undocumented.map((i) => i.variable)
    assert.ok(undocNames.includes('UNDOCUMENTED_SECRET'), 'UNDOCUMENTED_SECRET should be undocumented')
  })

  it('detects empty variables (in .env with no value)', () => {
    const scan = scanDirectory(FIXTURES)
    const envFiles = discoverEnvFiles(FIXTURES)
    const primary = findPrimaryEnv(envFiles)
    const example = findExampleFile(envFiles)

    const result = audit(scan, primary, example)
    const empty = result.issues.filter((i) => i.type === 'empty')

    const emptyNames = empty.map((i) => i.variable)
    assert.ok(emptyNames.includes('JWT_SECRET'), 'JWT_SECRET should be empty')
  })

  it('provides correct summary counts', () => {
    const scan = scanDirectory(FIXTURES)
    const envFiles = discoverEnvFiles(FIXTURES)
    const primary = findPrimaryEnv(envFiles)
    const example = findExampleFile(envFiles)

    const result = audit(scan, primary, example)

    assert.ok(result.summary.missing >= 2, 'At least 2 missing')
    assert.ok(result.summary.unused >= 1, 'At least 1 unused')
    assert.ok(result.summary.undocumented >= 1, 'At least 1 undocumented')
    assert.ok(result.summary.empty >= 1, 'At least 1 empty')
  })
})
