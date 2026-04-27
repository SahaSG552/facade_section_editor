import json
from pathlib import Path

# Read all the data
extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text())
analysis = json.loads(Path('graphify-out/.graphify_analysis.json').read_text())
detection = json.loads(Path('graphify-out/.graphify_detect.json').read_text())

# Create a minimal report
report_lines = [
    "# Facade Section Editor - Architecture Report",
    "",
    f"**Corpus:** {detection['total_files']} files, ~{detection['total_words']:,} words",
    "",
    "## God Nodes",
    "",
    "Core architectural anchors with highest influence:",
    ""
]

gods = analysis.get('god_nodes', [])
for i, god in enumerate(gods[:10], 1):
    label = god.get('label', 'Unknown')
    report_lines.append(f"{i}. **{label}**")

report_lines.extend([
    "",
    "## Surprising Connections",
    "",
    "Unexpected relationships revealing hidden coupling or integration points:",
    ""
])

surprises = analysis.get('surprises', [])
for i, surprise in enumerate(surprises[:10], 1):
    if isinstance(surprise, dict):
        src = surprise.get('source', 'Unknown')
        tgt = surprise.get('target', 'Unknown')
        report_lines.append(f"{i}. **{src}** → **{tgt}**")
    else:
        report_lines.append(f"{i}. {surprise}")

report_lines.extend([
    "",
    "## Graph Statistics",
    "",
    f"- **Nodes:** {len(analysis.get('communities', {}))} communities detected",
    f"- **Edges:** {len(extraction.get('edges', []))} relationships extracted",
    f"- **Extraction:** {len(extraction.get('nodes', []))} semantic nodes",
    ""
])

report = "\n".join(report_lines)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
print('GRAPH_REPORT.md written (minimal)')
