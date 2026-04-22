---
name: maintain-wiki
description: "Health-check wiki, fix contradictions, find gaps. Use when cleaning up the knowledge base."
trigger: lint, health check, fix wiki, clean wiki, check consistency, maintain
---

# Maintain Wiki Skill

Health-check and maintain wiki consistency.

## When to Use

- Periodic maintenance
- Before major updates
- After many ingests
- When wiki feels stale

## Workflow

### 1. Scan wiki pages

- Read `.wiki/index.md` to see all pages
- Look for inconsistencies
- Check timestamps

### 2. Find Issues

Check for:

**Contradictions:**

- Same topic in multiple places with different info
- Outdated claims that newer sources contradict

**Orphans:**

- Pages with no inbound links
- Pages not referenced by any other page

**Gaps:**

- Concepts mentioned but no page exists
- Missing cross-references between related pages

**Stale:**

- Pages not updated in long time
- Broken links
- Outdated information

### 3. Fix Issues

- Update contradictory pages
- Add orphan pages to relevant indexes
- Create pages for missing concepts
- Fix broken links
- Add cross-references

### 4. Log Action

```
## [[date]] lint | Health check
- Fixed: issues found
- Updated: pages modified
```

## Example

### Full Lint Pass

> "run lint on the wiki"

1. Read index and scan all pages
2. Find: operations.md has outdated offset info
3. Find: v-carve.md is orphan (no other page links to it)
4. Update operations.md with current info
5. Add cross-refs to v-carve.md from offset.md, bits.md
6. Log in `.wiki/log.md`

### Quick Fix

> "check if coordinate-systems.md is current"

1. Read coordinate-systems.md
2. Verify Three.js info is up to date
3. Update if needed
4. Log in log.md

## Key Checks

| Check          | How                          |
| -------------- | ---------------------------- |
| Contradictions | Compare related pages        |
| Orphans        | Look for pages with no links |
| Gaps           | Search for undefined terms   |
| Stale          | Check dates in frontmatter   |

## Rules

1. **Log everything**: Always log lint action
2. **Be conservative**: Don't remove, update instead
3. **Keep sources**: Note outdated but don't delete
4. **Fix both ways**: If A links to B, B should link back
