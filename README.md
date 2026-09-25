# envguard

Zero-dependency CLI to audit environment variables -- find missing, unused, and undocumented env vars across your codebase.

## Install

```bash
npm install -g @faizkhairi/envguard
```

## Usage

```bash
envguard                      # Audit current directory
envguard ./my-project         # Audit a specific project
envguard --json               # Output as JSON (for CI pipelines)
```

## What It Checks

| Type | Meaning |
|------|---------|
| **MISSING** | Referenced in code but not in `.env.example` |
| **UNUSED** | In `.env.example` but never referenced in code |
| **UNDOCUMENTED** | In `.env` but not documented in `.env.example` |
| **EMPTY** | Defined in `.env` but has no value |

## Example Output

```
envguard - Environment Variable Audit

  Scanned: 12 vars in code, 10 in .env, 8 in .env.example

  MISSING (2)
    x SMTP_HOST        Referenced in 1 file(s) but not in .env.example
    x STRIPE_SECRET     Referenced in 3 file(s) but not in .env.example

  UNUSED (1)
    ! LEGACY_API_KEY    Defined in .env.example but never referenced in code

  UNDOCUMENTED (1)
    ? DEBUG_MODE        Defined in .env but not documented in .env.example

  EMPTY (1)
    - JWT_SECRET        Defined in .env but has no value

  5 issue(s) found
```

## Supported Patterns

Detects env var references across languages and frameworks:

| Pattern | Example |
|---------|---------|
| `process.env.VAR` | Node.js, Next.js, NestJS |
| `process.env['VAR']` | Node.js bracket notation |
| `import.meta.env.VAR` | Vite, Nuxt, Astro |
| `Deno.env.get('VAR')` | Deno |
| `os.environ['VAR']` | Python |
| `os.getenv('VAR')` | Python |
| `os.Getenv("VAR")` | Go |
| `${VAR}` | Docker, YAML, shell |

## Scanned File Types

`.ts` `.tsx` `.js` `.jsx` `.mjs` `.cjs` `.vue` `.svelte` `.astro` `.py` `.rb` `.go` `.rs` `.java` `.kt` `.yaml` `.yml` `.toml`

## Options

```
--json               Output results as JSON
--include-builtins   Include built-in vars (NODE_ENV, PATH, etc.)
-h, --help           Show help
-v, --version        Show version
```

## CI Integration

envguard exits with code `1` when missing variables are found, making it easy to add to CI pipelines:

```yaml
# GitHub Actions
- run: npx @faizkhairi/envguard
```

```yaml
# GitLab CI
test:env:
  script: npx @faizkhairi/envguard
```

## Programmatic API

```typescript
import { scanDirectory, discoverEnvFiles, findExampleFile, findPrimaryEnv, audit } from 'envguard'

const scan = scanDirectory('./my-project')
const envFiles = discoverEnvFiles('./my-project')
const result = audit(scan, findPrimaryEnv(envFiles), findExampleFile(envFiles))

console.log(result.summary)    // { missing: 2, unused: 1, ... }
console.log(result.issues)     // [{ type: 'missing', variable: 'SMTP_HOST', ... }]
```

## License

MIT
