import json
from pathlib import Path

# Merge: combine AST + cached + semantic chunk results
all_nodes, all_edges, all_hyperedges = [], [], []

# Load AST
ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text())
all_nodes.extend(ast.get('nodes', []))
all_edges.extend(ast.get('edges', []))

# Load cached
cached_path = Path('graphify-out/.graphify_cached.json')
if cached_path.exists():
    cached = json.loads(cached_path.read_text())
    all_nodes.extend(cached.get('nodes', []))
    all_edges.extend(cached.get('edges', []))
    all_hyperedges.extend(cached.get('hyperedges', []))

# Semantic chunk from subagent
semantic_chunk = {
  "nodes": [
    {"id": "facade_section_editor", "label": "Facade Section Editor", "file_type": "document"},
    {"id": "modular_architecture", "label": "Modular Architecture", "file_type": "document"},
    
    {"id": "canvas_manager", "label": "CanvasManager", "file_type": "code"},
    {"id": "bits_manager", "label": "BitsManager", "file_type": "code"},
    {"id": "bits_table_manager", "label": "BitsTableManager", "file_type": "code"},
    {"id": "panel_manager", "label": "PanelManager", "file_type": "code"},
    {"id": "selection_manager", "label": "SelectionManager", "file_type": "code"},
    {"id": "interaction_manager", "label": "InteractionManager", "file_type": "code"},
    {"id": "three_module", "label": "ThreeModule", "file_type": "code"},
    {"id": "extrusion_builder", "label": "ExtrusionBuilder", "file_type": "code"},
    {"id": "csg_engine", "label": "CSGEngine", "file_type": "code"},
    {"id": "custom_offset_processor", "label": "CustomOffsetProcessor", "file_type": "code"},
    {"id": "export_module", "label": "ExportModule", "file_type": "code"},
    {"id": "mesh_repair", "label": "MeshRepair", "file_type": "code"},
    {"id": "offset_contour_builder", "label": "OffsetContourBuilder", "file_type": "code"},
    {"id": "manifold_csg", "label": "ManifoldCSG", "file_type": "code"},
    
    {"id": "base_module", "label": "BaseModule", "file_type": "code"},
    {"id": "event_bus", "label": "EventBus", "file_type": "code"},
    {"id": "logger_factory", "label": "LoggerFactory", "file_type": "code"},
    {"id": "app_core", "label": "Application Core", "file_type": "code"},
    {"id": "dependency_injection", "label": "Dependency Injection Container", "file_type": "code"},
    
    {"id": "v_carve_operation", "label": "V-Carve Operation", "file_type": "document"},
    {"id": "pocketing_operation", "label": "Pocketing (PO) Operation", "file_type": "document"},
    {"id": "offset_operation", "label": "Offset Calculation", "file_type": "document"},
    {"id": "bit_shape_creation", "label": "Bit Shape Creation", "file_type": "document"},
    {"id": "profile_path_assignment", "label": "Profile Path Assignment", "file_type": "document"},
    
    {"id": "coordinate_transform", "label": "Coordinate Transformation System", "file_type": "document"},
    {"id": "2d_3d_sync", "label": "2D/3D Synchronization", "file_type": "document"},
    {"id": "csg_operations", "label": "CSG Operations (Union/Subtract/Intersect)", "file_type": "document"},
    {"id": "arc_approximation", "label": "Arc Approximation (Bezier→Arc)", "file_type": "document"},
    {"id": "mesh_validation", "label": "Mesh Validation and Repair", "file_type": "document"},
    
    {"id": "anchor_system", "label": "Anchor System (Top-Left/Bottom-Left)", "file_type": "document"},
    {"id": "phantom_bits", "label": "Phantom Bits (V-Carve Visualization)", "file_type": "document"},
    {"id": "offset_contours", "label": "Offset Contours", "file_type": "document"},
    {"id": "dxf_export", "label": "DXF Export", "file_type": "document"},
    {"id": "signature_caching", "label": "Signature-Based CSG Caching", "file_type": "document"},
    
    {"id": "zoom_pan", "label": "Zoom and Pan Operations", "file_type": "document"},
    {"id": "selection_system", "label": "Multi-Selection Management", "file_type": "document"},
    {"id": "bit_dragging", "label": "Bit Dragging and Reordering", "file_type": "document"},
    
    {"id": "three_js", "label": "Three.js", "file_type": "document"},
    {"id": "paper_js", "label": "Paper.js", "file_type": "document"},
    {"id": "manifold_3d", "label": "manifold-3d", "file_type": "document"},
    {"id": "three_bvh_csg", "label": "three-bvh-csg", "file_type": "document"},
    {"id": "vite", "label": "Vite", "file_type": "document"},
    {"id": "vitest", "label": "Vitest", "file_type": "document"},
    {"id": "capacitor", "label": "Capacitor", "file_type": "document"},
    
    {"id": "svg_canvas", "label": "SVG Canvas (2D)", "file_type": "document"},
    {"id": "three_scene", "label": "Three.js Scene (3D)", "file_type": "document"},
    
    {"id": "dependency_injection_pattern", "label": "Dependency Injection Pattern", "file_type": "document"},
    {"id": "event_driven_pattern", "label": "Event-Driven Architecture", "file_type": "document"},
    {"id": "callback_pattern", "label": "Callback Pattern", "file_type": "document"},
    {"id": "module_pattern", "label": "Module Pattern", "file_type": "document"},
    {"id": "delegation_pattern", "label": "Delegation Pattern", "file_type": "document"},
    
    {"id": "y_down_coords", "label": "Y-Down Coordinate System (SVG/Paper.js)", "file_type": "document"},
    {"id": "y_up_coords", "label": "Y-Up Coordinate System (Three.js)", "file_type": "document"},
    {"id": "panel_center_origin", "label": "Panel Center Origin Transformation", "file_type": "document"},
    
    {"id": "offset_engine_refactor", "label": "Offset Engine Refactor Plan", "file_type": "document"},
    {"id": "primitive_offset_kernel", "label": "Primitive Offset Kernel", "file_type": "document"},
    {"id": "join_resolver", "label": "Join and Intersection Resolver", "file_type": "document"},
    {"id": "topology_reconstruction", "label": "Topology Reconstruction", "file_type": "document"},
    {"id": "degenerate_handling", "label": "Degenerate Segment Handling", "file_type": "document"},
    {"id": "hybrid_fallback", "label": "Hybrid Fallback Strategy", "file_type": "document"},
    
    {"id": "vertex_welding", "label": "Vertex Welding", "file_type": "document"},
    {"id": "degenerate_triangle_removal", "label": "Degenerate Triangle Removal", "file_type": "document"},
    {"id": "short_edge_removal", "label": "Short Edge Removal", "file_type": "document"},
    {"id": "non_manifold_repair", "label": "Non-Manifold Edge Repair", "file_type": "document"},
    {"id": "self_intersection_detection", "label": "Self-Intersection Detection", "file_type": "document"},
    
    {"id": "post_extrusion_repair", "label": "Post-Extrusion Repair", "file_type": "document"},
    {"id": "pre_csg_repair", "label": "Pre-CSG Repair", "file_type": "document"},
    {"id": "pre_export_validation", "label": "Pre-Export Validation", "file_type": "document"},
    
    {"id": "jsoc_requirements", "label": "JSDoc Requirements", "file_type": "document"},
    {"id": "logging_system", "label": "Logging System Standards", "file_type": "document"},
    {"id": "testing_checklist", "label": "Testing Checklist", "file_type": "document"},
    {"id": "development_standards", "label": "Development Standards and Patterns", "file_type": "document"}
  ],
  "edges": [
    {"source": "facade_section_editor", "target": "modular_architecture", "relation": "uses", "confidence": "EXTRACTED"},
    {"source": "modular_architecture", "target": "base_module", "relation": "built_on", "confidence": "EXTRACTED"},
    
    {"source": "modular_architecture", "target": "canvas_manager", "relation": "includes", "confidence": "EXTRACTED"},
    {"source": "modular_architecture", "target": "bits_manager", "relation": "includes", "confidence": "EXTRACTED"},
    {"source": "modular_architecture", "target": "bits_table_manager", "relation": "includes", "confidence": "EXTRACTED"},
    {"source": "modular_architecture", "target": "panel_manager", "relation": "includes", "confidence": "EXTRACTED"},
    {"source": "modular_architecture", "target": "selection_manager", "relation": "includes", "confidence": "EXTRACTED"},
    {"source": "modular_architecture", "target": "interaction_manager", "relation": "includes", "confidence": "EXTRACTED"},
    {"source": "modular_architecture", "target": "three_module", "relation": "includes", "confidence": "EXTRACTED"},
    {"source": "modular_architecture", "target": "export_module", "relation": "includes", "confidence": "EXTRACTED"},
    
    {"source": "app_core", "target": "base_module", "relation": "registers_all", "confidence": "EXTRACTED"},
    {"source": "app_core", "target": "event_bus", "relation": "coordinates_via", "confidence": "EXTRACTED"},
    {"source": "app_core", "target": "dependency_injection", "relation": "manages", "confidence": "EXTRACTED"},
    
    {"source": "canvas_manager", "target": "svg_canvas", "relation": "manages", "confidence": "EXTRACTED"},
    {"source": "canvas_manager", "target": "zoom_pan", "relation": "implements", "confidence": "EXTRACTED"},
    
    {"source": "panel_manager", "target": "anchor_system", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "panel_manager", "target": "coordinate_transform", "relation": "uses", "confidence": "EXTRACTED"},
    
    {"source": "bits_manager", "target": "bit_shape_creation", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "bits_manager", "target": "profile_path_assignment", "relation": "implements", "confidence": "EXTRACTED"},
    
    {"source": "bits_table_manager", "target": "selection_system", "relation": "integrates_with", "confidence": "EXTRACTED"},
    {"source": "bits_table_manager", "target": "bit_dragging", "relation": "implements", "confidence": "EXTRACTED"},
    
    {"source": "selection_manager", "target": "selection_system", "relation": "implements", "confidence": "EXTRACTED"},
    
    {"source": "interaction_manager", "target": "zoom_pan", "relation": "handles", "confidence": "EXTRACTED"},
    {"source": "interaction_manager", "target": "bit_dragging", "relation": "handles", "confidence": "EXTRACTED"},
    
    {"source": "three_module", "target": "three_scene", "relation": "manages", "confidence": "EXTRACTED"},
    {"source": "three_module", "target": "2d_3d_sync", "relation": "enables", "confidence": "EXTRACTED"},
    {"source": "three_module", "target": "signature_caching", "relation": "implements", "confidence": "EXTRACTED"},
    
    {"source": "extrusion_builder", "target": "arc_approximation", "relation": "uses", "confidence": "EXTRACTED"},
    {"source": "extrusion_builder", "target": "post_extrusion_repair", "relation": "triggers", "confidence": "EXTRACTED"},
    {"source": "extrusion_builder", "target": "mesh_repair", "relation": "calls", "confidence": "EXTRACTED"},
    
    {"source": "csg_engine", "target": "csg_operations", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "three_module", "target": "csg_engine", "relation": "uses", "confidence": "EXTRACTED"},
    
    {"source": "manifold_csg", "target": "pre_csg_repair", "relation": "triggers", "confidence": "EXTRACTED"},
    {"source": "manifold_csg", "target": "mesh_repair", "relation": "calls", "confidence": "EXTRACTED"},
    
    {"source": "custom_offset_processor", "target": "offset_operation", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "custom_offset_processor", "target": "primitive_offset_kernel", "relation": "uses", "confidence": "EXTRACTED"},
    {"source": "custom_offset_processor", "target": "join_resolver", "relation": "uses", "confidence": "EXTRACTED"},
    {"source": "custom_offset_processor", "target": "topology_reconstruction", "relation": "uses", "confidence": "EXTRACTED"},
    
    {"source": "offset_contour_builder", "target": "offset_contours", "relation": "builds", "confidence": "EXTRACTED"},
    {"source": "offset_contour_builder", "target": "degenerate_handling", "relation": "manages", "confidence": "EXTRACTED"},
    
    {"source": "export_module", "target": "dxf_export", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "export_module", "target": "arc_approximation", "relation": "uses", "confidence": "EXTRACTED"},
    
    {"source": "v_carve_operation", "target": "phantom_bits", "relation": "creates", "confidence": "EXTRACTED"},
    {"source": "v_carve_operation", "target": "offset_operation", "relation": "uses", "confidence": "EXTRACTED"},
    
    {"source": "pocketing_operation", "target": "offset_operation", "relation": "uses", "confidence": "EXTRACTED"},
    
    {"source": "coordinate_transform", "target": "y_down_coords", "relation": "transforms_from", "confidence": "EXTRACTED"},
    {"source": "coordinate_transform", "target": "y_up_coords", "relation": "transforms_to", "confidence": "EXTRACTED"},
    {"source": "coordinate_transform", "target": "panel_center_origin", "relation": "applies", "confidence": "EXTRACTED"},
    
    {"source": "2d_3d_sync", "target": "canvas_manager", "relation": "syncs", "confidence": "EXTRACTED"},
    {"source": "2d_3d_sync", "target": "three_module", "relation": "syncs", "confidence": "EXTRACTED"},
    {"source": "2d_3d_sync", "target": "coordinate_transform", "relation": "requires", "confidence": "EXTRACTED"},
    
    {"source": "offset_engine_refactor", "target": "primitive_offset_kernel", "relation": "introduces", "confidence": "EXTRACTED"},
    {"source": "offset_engine_refactor", "target": "join_resolver", "relation": "introduces", "confidence": "EXTRACTED"},
    {"source": "offset_engine_refactor", "target": "topology_reconstruction", "relation": "introduces", "confidence": "EXTRACTED"},
    {"source": "offset_engine_refactor", "target": "hybrid_fallback", "relation": "introduces", "confidence": "EXTRACTED"},
    
    {"source": "mesh_repair", "target": "vertex_welding", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "mesh_repair", "target": "degenerate_triangle_removal", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "mesh_repair", "target": "short_edge_removal", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "mesh_repair", "target": "non_manifold_repair", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "mesh_repair", "target": "self_intersection_detection", "relation": "implements", "confidence": "EXTRACTED"},
    
    {"source": "post_extrusion_repair", "target": "mesh_repair", "relation": "uses", "confidence": "EXTRACTED"},
    {"source": "pre_csg_repair", "target": "mesh_repair", "relation": "uses", "confidence": "EXTRACTED"},
    {"source": "pre_export_validation", "target": "mesh_repair", "relation": "uses", "confidence": "EXTRACTED"},
    
    {"source": "three_module", "target": "pre_export_validation", "relation": "triggers", "confidence": "EXTRACTED"},
    
    {"source": "base_module", "target": "dependency_injection_pattern", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "app_core", "target": "event_driven_pattern", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "modular_architecture", "target": "callback_pattern", "relation": "uses", "confidence": "EXTRACTED"},
    {"source": "modular_architecture", "target": "module_pattern", "relation": "uses", "confidence": "EXTRACTED"},
    
    {"source": "three_js", "target": "three_module", "relation": "powers", "confidence": "EXTRACTED"},
    {"source": "paper_js", "target": "canvas_manager", "relation": "supports", "confidence": "EXTRACTED"},
    {"source": "manifold_3d", "target": "csg_engine", "relation": "supports", "confidence": "EXTRACTED"},
    {"source": "three_bvh_csg", "target": "csg_engine", "relation": "supports", "confidence": "EXTRACTED"},
    
    {"source": "vite", "target": "facade_section_editor", "relation": "builds", "confidence": "EXTRACTED"},
    {"source": "vitest", "target": "facade_section_editor", "relation": "tests", "confidence": "EXTRACTED"},
    {"source": "capacitor", "target": "facade_section_editor", "relation": "deploys_to_mobile", "confidence": "EXTRACTED"},
    
    {"source": "logger_factory", "target": "logging_system", "relation": "implements", "confidence": "EXTRACTED"},
    {"source": "jsoc_requirements", "target": "development_standards", "relation": "part_of", "confidence": "EXTRACTED"},
    {"source": "logging_system", "target": "development_standards", "relation": "part_of", "confidence": "EXTRACTED"},
    {"source": "testing_checklist", "target": "development_standards", "relation": "part_of", "confidence": "EXTRACTED"},
    
    {"source": "offset_contours", "target": "v_carve_operation", "relation": "visualizes", "confidence": "EXTRACTED"},
    {"source": "offset_contours", "target": "pocketing_operation", "relation": "visualizes", "confidence": "EXTRACTED"},
    
    {"source": "signature_caching", "target": "three_module", "relation": "optimizes", "confidence": "EXTRACTED"},
    {"source": "signature_caching", "target": "2d_3d_sync", "relation": "prevents_rebuilds_in", "confidence": "EXTRACTED"},
    
    {"source": "arc_approximation", "target": "dxf_export", "relation": "improves_precision_for", "confidence": "EXTRACTED"},
    {"source": "arc_approximation", "target": "three_scene", "relation": "improves_rendering_for", "confidence": "EXTRACTED"},
    
    {"source": "degenerate_handling", "target": "offset_operation", "relation": "critical_for", "confidence": "EXTRACTED"},
    {"source": "degenerate_handling", "target": "v_carve_operation", "relation": "required_for", "confidence": "EXTRACTED"},
    
    {"source": "canvas_manager", "target": "panel_manager", "relation": "coordinates_with", "confidence": "EXTRACTED"},
    {"source": "canvas_manager", "target": "bits_manager", "relation": "renders", "confidence": "EXTRACTED"},
    {"source": "selection_manager", "target": "bits_table_manager", "relation": "syncs_with", "confidence": "EXTRACTED"},
    {"source": "interaction_manager", "target": "selection_manager", "relation": "updates", "confidence": "EXTRACTED"}
  ],
  "hyperedges": []
}

all_nodes.extend(semantic_chunk.get('nodes', []))
all_edges.extend(semantic_chunk.get('edges', []))
all_hyperedges.extend(semantic_chunk.get('hyperedges', []))

merged = {'nodes': all_nodes, 'edges': all_edges, 'hyperedges': all_hyperedges, 'input_tokens': 0, 'output_tokens': 0}
Path('graphify-out/.graphify_extract.json').write_text(json.dumps(merged, indent=2))
nodes_count = len(all_nodes)
edges_count = len(all_edges)
print(f'Merged: {nodes_count} nodes, {edges_count} edges')
