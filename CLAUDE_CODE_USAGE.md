# Claude Code Usage Summary

## Used For

### Visualization Implementation (Iterative Improvement)
- A-Frame 3D/VR components (graph-loader.js, graph-interaction.js, info-panel.js, vr-controls.js)
- 2D Vis.js visualization refinement
- VR click/hover interaction fixes
- Info panel positioning (desktop vs VR)
- VR controls (thumbstick movement, hand controllers)
- VR legend implementation

### Data Processing
- `data_processor.py` - CSV to JSON conversion, filtering to persons-only
- `calculate_positions.py` - 3D Fruchterman-Reingold layout algorithm

### User Study Analysis
- `process_data.py` - Statistical analysis (t-test, Wilcoxon, McNemar's, Cohen's d)
- `data_entry_helper.py` - CLI for questionnaire data entry
- Publication-quality plots (matplotlib/seaborn, 300 DPI)

### Project Cleanup
- Removed duplicate JSON files
- Updated .gitignore

---

## NOT Used For

- User study design & execution
- Thesis writing (literature review, discussion, conclusions)

