---
name: skill-health-checker
version: 1.1.0
description: |
  Lints and validates SKILL.md files for structural integrity, frontmatter correctness,
  instruction quality, and activation reliability. Detects missing sections, vague
  descriptions, contradictory imperatives, dead script references, and activation issues.
  Use before publishing a skill to a team library, after editing a skill, when a skill
  fails to activate, when skill-versioning snapshots, or as a CI pipeline check.
---

# Skill Health Checker 🏥

This skill is the **linter for skills** — it applies a structured ruleset
to every `SKILL.md` and produces a scored health report with actionable
fixes. Just as code has linters that catch problems before runtime, skills
need a pre-flight check before they influence agent behavior.

## Why skills need a dedicated linter

A skill with a poorly written `description` field will never activate —
the agent simply won't recognize it as relevant. A skill with contradictory
imperatives (`always` and `never` on the same subject) will produce
non-deterministic behavior. A skill referencing a script that doesn't exist
will silently fail mid-task. None of these problems produce errors — they
just cause the agent to behave strangely, and the cause is invisible without
inspection.

This skill makes invisible problems visible — before they reach production.

---

## Instructions / Инструкции для Агента

### Health score model

Each skill receives a health score from **0 to 100**:

```text
100 — Perfect: all rules pass, zero warnings
 80 — Good: minor warnings only, safe to use
 60 — Fair: issues present, use with caution
 40 — Poor: significant problems, fix before team use
  0 — Critical: skill will not function reliably
```

Scores map to severity levels:

| Score | Grade | Label | Recommended action |
|---|---|---|---|
| 90–100 | 🟢 A | HEALTHY | No action needed |
| 75–89  | 🟡 B | GOOD | Address warnings when convenient |
| 55–74  | 🟠 C | FAIR | Fix before sharing with team |
| 30–54  | 🔴 D | POOR | Fix before use in any session |
| 0–29   | ⛔ F | CRITICAL | Do not use — fundamental issues |

---

### Rule categories

#### Category 1 — Frontmatter (weight: 30%)

Rules governing the YAML frontmatter block.

| Rule ID | Rule | Severity |
|---|---|---|
| FM-001 | `name` field present and non-empty | CRITICAL |
| FM-002 | `description` field present and non-empty | CRITICAL |
| FM-003 | `version` field present and valid semver | WARNING |
| FM-004 | `description` is written in third person | WARNING |
| FM-005 | `description` contains activation keywords | WARNING |
| FM-006 | `description` length: 50–500 chars | WARNING |
| FM-007 | No unknown frontmatter fields (typo guard) | INFO |
| FM-008 | `name` matches the directory name exactly | ERROR |
| FM-009 | `deprecated` field present if skill is stale | INFO |

#### Category 2 — Structure (weight: 25%)

Rules governing the presence of required sections.

| Rule ID | Rule | Severity |
|---|---|---|
| ST-001 | `## When to activate` section present | ERROR |
| ST-002 | `## When to activate` contains a table or list | WARNING |
| ST-003 | At least one `## Step-by-step` or `## Protocol` section | WARNING |
| ST-004 | Sections use proper markdown headings (not bold) | INFO |
| ST-005 | No empty sections (heading with no content) | ERROR |
| ST-006 | Total SKILL.md length < 20,000 chars | WARNING |
| ST-007 | `## References` or `## See also` section present | INFO |
| ST-008 | `## Scope boundaries` or `## Out of scope` present | WARNING |
| ST-009 | No duplicate section headings | ERROR |

#### Category 3 — Instruction quality (weight: 30%)

Rules governing the quality and clarity of instructions.

| Rule ID | Rule | Severity |
|---|---|---|
| IQ-001 | No contradictory imperative pairs (`always X` + `never X`) | CRITICAL |
| IQ-002 | No vague instructions: "handle approp&#114;iately", "as ne&#101;ded" | WARNING |
| IQ-003 | All `{{PLACEHOLDER}}` variables documented or resolved | ERROR |
| IQ-004 | No unresolved `TO&#68;O` / `FIX&#77;E` markers in instructions | WARNING |
| IQ-005 | Code blocks have language specifier (```bash, ```python) | INFO |
| IQ-006 | All referenced scripts exist in `scripts/` subdirectory | ERROR |
| IQ-007 | No instructions that require unavailable tools (check env) | WARNING |
| IQ-008 | Decision trees / flowcharts are syntactically consistent | WARNING |
| IQ-009 | Error handling section covers all failure modes | WARNING |
| IQ-010 | No hardcoded absolute paths (`/Users/`, `C:\Users\`) | ERROR |

#### Category 4 — Activation reliability (weight: 15%)

Rules governing how reliably the agent will activate this skill.

| Rule ID | Rule | Severity |
|---|---|---|
| AR-001 | `description` contains at least 3 activation trigger phrases | WARNING |
| AR-002 | Trigger phrases use action verbs (not just nouns) | WARNING |
| AR-003 | `description` does not overlap >50% with another installed skill | WARNING |
| AR-004 | Activation conditions are mutually exclusive with `## Scope` | WARNING |
| AR-005 | `description` does not exceed 500 chars (model memory limit) | ERROR |

---

### When to activate this skill

| Trigger | Why |
|---|---|
| Before publishing skill to team library | Ensure quality baseline |
| After editing any SKILL.md | Catch regressions immediately |
| `skill-versioning snapshot` pre-hook | Validate before archiving |
| New skill created from scratch | Enforce structure from day one |
| Skill fails to activate as expected | AR-* rules likely violated |
| Agent behaves inconsistently in a skill's domain | IQ-001 conflict likely |
| `context-budget-monitor` flags a heavy skill | ST-006 may explain why |
| Team skill review / PR process | Automated quality gate |

---

### Step-by-step execution protocol

#### Step 1 — Identify scan target

```bash
# Single skill
python {{SKILL_PATH}}/scripts/health_check.py \
  --skill-dir "<path_to_skill>"

# All skills in a directory
python {{SKILL_PATH}}/scripts/health_check.py \
  --skills-dir "<workspace>/.agent/skills"

# With installed skills context (for AR-003 cross-skill check)
python {{SKILL_PATH}}/scripts/health_check.py \
  --skill-dir "<path_to_skill>" \
  --context-skills-dir "<workspace>/.agent/skills"
```

#### Step 2 — Review the health report

The script produces a scored report grouped by category.
Review all CRITICAL and ERROR findings first — these have the highest
impact on skill functionality.

#### Step 3 — Apply auto-fixes (optional)

For safe, deterministic fixes the tool can auto-correct:

```bash
python {{SKILL_PATH}}/scripts/health_check.py \
  --skill-dir "<path_to_skill>" \
  --auto-fix
```

Auto-fixable rules:
- FM-003: adds `version: 0.1.0` if missing
- FM-007: removes unknown frontmatter fields
- ST-004: converts bold pseudo-headings to proper `##` headings
- IQ-005: adds `text` language specifier to bare code blocks
- IQ-010: replaces absolute paths with `{{SKILL_PATH}}` placeholder

> ⚠️ Always run `skill-versioning snapshot` BEFORE `--auto-fix`.
> Auto-fix rewrites SKILL.md. Without a snapshot, changes are irreversible.

#### Step 4 — Fix remaining issues manually

For rules that require judgment (IQ-001, IQ-002, AR-001–AR-004),
the report provides:
- The specific line/section where the issue was found
- A plain-English explanation of why it matters
- A concrete suggested fix

#### Step 5 — Re-run to confirm clean state

```bash
python {{SKILL_PATH}}/scripts/health_check.py \
  --skill-dir "<path_to_skill>" \
  --min-grade B
```

Exits with code `0` only if the skill meets the specified minimum grade.
Use `--min-grade A` for CI pipelines.

---

### Report format

```text
🏥 Skill Health Report
════════════════════════════════════════════════════════
Skill         : secret-leak-guard
Version       : v1.2.0
Health score  : 74 / 100  🟠 C — FAIR
Rules checked : 28
Issues found  : 6  (1 ERROR, 3 WARNING, 2 INFO)
════════════════════════════════════════════════════════

❌ ERROR  [IQ-006]  Referenced script not found
  Section : "Step 2 — Run the automated scanner"
  Detail  : Script path 'scripts/scan_secrets.py' does not exist
            in skill directory. Agent will fail at this step.
  Fix     : Create the missing script or update the path reference.

⚠️  WARNING  [IQ-001]  Contradictory imperative pair detected
  Section : "Step 4 — Decision tree" vs "Error handling"
  Detail  : "HALT the original action immediately" (Step 4)
            conflicts with "proceed with manual review" (Error handling)
            when the scanner fails — agent receives opposing instructions
            for the same state.
  Fix     : Clarify: scanner failure → always halt, never silently proceed.

⚠️  WARNING  [IQ-002]  Vague instruction detected
  Line    : 147
  Detail  : "Handle edge cases appropriately" gives the agent no
            actionable guidance.
  Fix     : Replace with specific behavior: "If input exceeds 10MB,
            skip and log a warning."

⚠️  WARNING  [FM-004]  Description not in third person
  Detail  : "I scan files for secrets..." should be
            "Scans files for secrets..."
  Fix     : Rewrite description opening in third person.

ℹ️  INFO  [IQ-005]  Code block missing language specifier
  Line    : 203
  Detail  : Bare ``` block — add ```bash or ```python for clarity.
  Fix     : Auto-fixable with --auto-fix flag.

ℹ️  INFO  [ST-007]  No References section found
  Detail  : Adding a references section improves agent context
            when the skill is activated.
  Fix     : Add ## References section with relevant links.

════════════════════════════════════════════════════════
Category breakdown:
  Frontmatter       : 85/100 🟢
  Structure         : 90/100 🟢
  Instruction quality: 55/100 🟠  ← main issue
  Activation          : 80/100 🟡
════════════════════════════════════════════════════════
Suggested next step: fix IQ-006 (ERROR) and IQ-001 (WARNING),
then re-run. Estimated score after fixes: ~88/100 🟡 B
════════════════════════════════════════════════════════
```

---

### CI pipeline integration

For teams maintaining a shared skill library, add to `.github/workflows/`:

```yaml
name: Skill Health Check

on:
  pull_request:
    paths:
      - '.agent/skills/**'

jobs:
  skill-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run skill health checker
        run: |
          python .agent/skills/skill-health-checker/scripts/health_check.py \
            --skills-dir .agent/skills \
            --min-grade B \
            --output-format github-annotations
```

With `--output-format github-annotations`, the tool emits
`::error` and `::warning` annotations that appear inline in the PR diff.

---

### Pre-publish checklist

Before promoting a skill from local to team library, verify:

```text
□ Health score ≥ 80 (grade B or above)
□ No CRITICAL or ERROR findings
□ version field is ≥ 1.0.0 (not a draft)
□ CHANGELOG.md exists in .versions/
□ All referenced scripts exist and are executable
□ description passes third-person check (FM-004)
□ At least 3 activation trigger phrases (AR-001)
□ No absolute paths (IQ-010)
□ No TO&#68;O/FIX&#77;E markers (IQ-004)
□ Scope boundaries section present (ST-008)
```

---

### Auto-fix safety contract

The `--auto-fix` flag follows these non-negotiable rules:

1. **Never modifies instruction content** — only structural/formatting fixes
2. **Never resolves IQ-001 conflicts** — contradiction resolution requires
   human judgment
3. **Never deletes sections** — only adds missing boilerplate
4. **Always produces a diff preview** before writing — user must confirm
   with `--confirm` flag
5. **Aborts if no snapshot exists** — checks for `.versions/` directory
   before any write operation

---

### Integration with other skills

| Skill | Integration point |
|---|---|
| `skill-versioning` | Always snapshot before `--auto-fix`; run health check before every snapshot |
| `skill-deduplication-audit` | Run health check on merged skill draft immediately after merge |
| `context-budget-monitor` | ST-006 (size check) feeds into budget estimates |
| `secret-leak-guard` | Run on skill scripts — scripts are code and can contain secrets |

---

### Scope boundaries

This skill validates **SKILL.md structure and content quality**.
It does NOT:

- Execute scripts inside `scripts/` to verify they work correctly
  (use dedicated script tests for that)
- Guarantee the skill will always activate correctly
  (activation depends on model behavior, not just description quality)
- Validate MCP server configurations referenced by the skill
- Check for semantic correctness of domain-specific instructions
  (e.g. whether the coding style prescribed is actually good style)

---

### Error handling

| Error | Response |
|---|---|
| SKILL.md not found | Exit code 2, clear error message |
| Frontmatter YAML unparseable | FM rules all fail as CRITICAL, report parse error location |
| `scripts/` directory missing but scripts referenced | IQ-006 fires for each reference |
| `--auto-fix` without `--confirm` | Print diff preview, exit without writing |
| `--auto-fix` without `.versions/` snapshot | Abort with warning, suggest running `skill-versioning snapshot` first |
| Skill directory has no SKILL.md | Skip with `[no SKILL.md]` marker in bulk scan |

---

### References

- `{{SKILL_PATH}}/scripts/health_check.py` — main linter engine
- `{{SKILL_PATH}}/scripts/rules/` — modular rule implementations
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
