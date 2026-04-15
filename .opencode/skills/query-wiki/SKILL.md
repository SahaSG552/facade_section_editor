---
name: query-wiki
description: "Query wiki for knowledge. Uses index and search to find relevant information."
trigger: how do I, explain, what is, how to, find in wiki, lookup
---

# Query Wiki Skill

Query the wiki for knowledge and synthesize answers.

## When to Use

- When user asks about project
- When needing technical information
- Before implementing features

## Workflow

### 1. Read Index First
- Start with `.wiki/index.md`
- Identify relevant category (entities, concepts, sources)
- Note related pages

### 2. Search Pages
- Use grep or read relevant pages
- Focus on pages matching query topic

### 3. Synthesize Answer
- Combine information from sources
- Include citations to wiki pages
- Note any gaps or contradictions

### 4. Optionally File Back
- If answer is valuable, create new wiki page
- Update index and log

## Example

### Query: V-Carve
> "how does V-Carve work?"

1. Read index.md → find v-carve.md in Concepts
2. Read v-carve.md
3. Cross-ref: operations.md, offset.md, extrusion.md
4. Synthesize: V-Carve creates V-shaped cuts using multi-pass offsets
5. Answer with citations

### Query: Offset Libraries
> "what offset libraries are available?"

1. Read index.md → find libraries.md and offset.md
2. Read offset.md → lists paperjs-offset, paper-clipper
3. Read libraries.md → lists dependencies
4. Synthesize answer with comparison

### Query: 2D to 3D Transform
> "how do I convert coordinates?"

1. Read index.md → find coordinate-systems.md
2. Read coordinate-systems.md
3. Find transform functions
4. Provide code example

## MCP Search (qmd)

If qmd is installed:
```bash
curl http://localhost:8080/search?q=v-carve
```

## Response Format

When answering, include:

1. **Direct answer** to the question
2. **Citations**: `[v-carve.md](concepts/v-carve.md)`
3. **Related pages**: Other relevant wiki pages
4. **Gaps**: If information is incomplete

## Key Files

- `.wiki/index.md` - Always read first
- `.wiki/log.md` - Recent activity

## Rules

1. **Read index first**: Don't skip index.md
2. **Cite sources**: Link to wiki pages
3. **Synthesize**: Combine from multiple sources
4. **File valuable answers**: Consider creating new wiki page