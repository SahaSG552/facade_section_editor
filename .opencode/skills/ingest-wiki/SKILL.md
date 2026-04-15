---
name: ingest-wiki
description: "Process new sources into wiki. Use when adding new documentation, articles, notes, or learning new information."
trigger: ingest, add source, add to wiki, process documentation, learn about, research
---

# Ingest Wiki Skill

Process new source documents into the project wiki system.

## When to Use

- Adding new documentation to the project
- Processing articles or papers
- Learning new libraries or technologies
- Research findings that should be documented

## Workflow

### 1. Read Source
- Read source from `raw/` directory or web
- Extract key information
- Identify entities and concepts

### 2. Determine Category
- **Entity page**: Things (bits, operations, panels, modules, libraries)
- **Concept page**: Concepts (offset, v-carve, csg, coordinate transforms)
- **Source summary**: From external documentation

### 3. Create or Update Wiki Page
- If new topic → create in appropriate folder
- If existing topic → update with new information
- Add frontmatter with tags and date

### 4. Update Index
- Add new page to `.wiki/index.md` under appropriate category
- Ensure one-line summary

### 5. Add Cross-References
- Find existing pages that relate to new content
- Add links to both pages

### 6. Log Action
- Append entry to `.wiki/log.md`:
```
## [[date]] ingest | Source name
- Source: description
- Extracted: key information
- Updated: affected pages
- Cross-ref: links created
```

## Example

### Ingest: Paper.js Documentation
> "ingest Paper.js path operations"

1. Read Paper.js docs online or from raw/
2. Create/update `.wiki/concepts/offset.md` with Paper.js patterns
3. Update `.wiki/index.md` → add to Concepts
4. Cross-ref: bits.md, v-carve.md, pocketing.md
5. Log in `.wiki/log.md`

### Ingest: User Notes
> "ingest my notes on V-Carve algorithms"

1. Read notes from `raw/own-notes/`
2. Create `.wiki/sources/user-notes-vcarve.md`
3. Update entity: operations.md with new info
4. Cross-ref: v-carve.md
5. Log in `.wiki/log.md`

## Key Files

- `.wiki/index.md` - Always update on ingest
- `.wiki/log.md` - Always append on ingest
- Entities: `entities/bits.md`, `entities/operations.md`, etc.
- Concepts: `concepts/offset.md`, `concepts/v-carve.md`, etc.

## Rules

1. **Immutable sources**: Never modify files in `raw/`
2. **Update index**: Always update index.md after creating page
3. **Log everything**: Always log ingest action
4. **Cross-reference**: Link related pages both ways
5. **Use templates**: Follow page structure in WIKI.md