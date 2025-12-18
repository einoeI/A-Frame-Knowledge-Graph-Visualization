"""
LOTR Knowledge Graph Data Processor
Converts CSV files to clean JSON for 2D and 3D visualizations

This script creates a shared JSON data file that can be used by both:
- 2D visualization (Vis.js)
- 3D visualization (A-Frame)

Run from src/data/ directory:
    python data_processor.py
"""

import pandas as pd
import json
import os
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.resolve()

# Race color mappings (consistent across visualizations)
# Matches the reference paper's dark aesthetic with light-colored data elements
RACE_COLORS = {
    'men': '#7A84DD',      # Blue-purple
    'elves': '#8ACAE5',    # Light blue
    'hobbit': '#BD9267',   # Brown
    'dwarf': '#B15B60',    # Red-brown
    'ainur': '#3A7575',    # Teal (wizards)
    'ents': '#E3845D',     # Orange
    'orcs': '#020104',     # Near black
    'animal': '#8ACAE5'    # Light blue
}

def load_data():
    """Load LOTR CSV data from relative paths"""
    ontology_path = SCRIPT_DIR / 'lotr' / 'ontology' / 'ontology.csv'
    network_path = SCRIPT_DIR / 'lotr' / 'tables' / 'networks-id-3books.csv'

    print(f"Loading ontology from: {ontology_path}")
    print(f"Loading network from: {network_path}")

    ontology = pd.read_csv(ontology_path, sep='\t')
    network = pd.read_csv(network_path)
    return ontology, network

def filter_persons(ontology):
    """Filter to only person nodes"""
    persons = ontology[ontology['type'] == 'per'].copy()
    return persons

def filter_edges(network, node_ids):
    """Filter edges to only include those between selected nodes"""
    edges = network[
        network['IdSource'].isin(node_ids) & 
        network['IdTarget'].isin(node_ids)
    ].copy()
    return edges

def create_nodes_json(persons_df):
    """Convert persons dataframe to node JSON structure"""
    nodes = []
    
    for _, row in persons_df.iterrows():
        node = {
            'id': row['id'],
            'label': row['Label'],
            'race': row['subtype'],
            'gender': row['gender'] if pd.notna(row['gender']) else 'unknown',
            'weight': int(row['FreqSum']),
            'size': max(10, row['FreqSum'] / 40),  # Visual size
            'color': RACE_COLORS.get(row['subtype'], '#7A84DD')
        }
        nodes.append(node)
    
    return nodes

def create_edges_json(edges_df):
    """Convert edges dataframe to link JSON structure"""
    edges = []
    
    for _, row in edges_df.iterrows():
        edge = {
            'source': row['IdSource'],
            'target': row['IdTarget'],
            'weight': int(row['Weight']),
            'label': f"{row['Weight']} co-appearances"
        }
        edges.append(edge)
    
    return edges

def calculate_node_stats(nodes, edges):
    """Add connection statistics to nodes"""
    for node in nodes:
        node_id = node['id']
        
        # Find all connections
        connections = [e for e in edges if e['source'] == node_id or e['target'] == node_id]
        node['total_connections'] = len(connections)
        
        # Find strongest connection
        if connections:
            strongest = max(connections, key=lambda x: x['weight'])
            if strongest['source'] == node_id:
                partner_id = strongest['target']
            else:
                partner_id = strongest['source']
            
            partner_name = next((n['label'] for n in nodes if n['id'] == partner_id), 'Unknown')
            
            node['strongest_connection'] = {
                'character': partner_name,
                'weight': strongest['weight']
            }
        else:
            node['strongest_connection'] = None
    
    return nodes

def main():
    print("=" * 50)
    print("LOTR Knowledge Graph Data Processor")
    print("=" * 50)

    print("\n[1/5] Loading data...")
    ontology, network = load_data()

    print("\n[2/5] Filtering to persons only...")
    persons = filter_persons(ontology)
    print(f"  Found {len(persons)} characters")

    print("\n[3/5] Filtering edges...")
    person_ids = persons['id'].tolist()
    edges_filtered = filter_edges(network, person_ids)
    print(f"  Found {len(edges_filtered)} relationships")

    print("\n[4/5] Creating JSON structures...")
    nodes = create_nodes_json(persons)
    edges = create_edges_json(edges_filtered)

    print("\n[5/5] Calculating node statistics...")
    nodes = calculate_node_stats(nodes, edges)

    # Calculate max weight for opacity scaling (used by visualizations)
    max_weight = max(e['weight'] for e in edges) if edges else 1

    # Create combined file with metadata
    combined = {
        'metadata': {
            'description': 'LOTR Character Interaction Network - Persons Only',
            'node_count': len(nodes),
            'edge_count': len(edges),
            'max_edge_weight': max_weight,
            'races': list(set(n['race'] for n in nodes)),
            'source': 'networks-id-3books.csv (all 3 books combined)'
        },
        'nodes': nodes,
        'links': edges
    }

    # Save to src/data directory (same location as this script)
    output_path = SCRIPT_DIR / 'lotr_graph.json'
    print(f"\nSaving to: {output_path}")

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(combined, f, indent=2)

    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    print(f"Nodes: {len(nodes)}")
    print(f"Edges: {len(edges)}")
    print(f"Max edge weight: {max_weight}")
    print(f"Races: {set(n['race'] for n in nodes)}")

    print("\nTop 5 most connected characters:")
    top_chars = sorted(nodes, key=lambda x: x['total_connections'], reverse=True)[:5]
    for char in top_chars:
        strongest = char.get('strongest_connection')
        strongest_str = f" (strongest: {strongest['character']}, {strongest['weight']})" if strongest else ""
        print(f"  {char['label']}: {char['total_connections']} connections{strongest_str}")

    print("\nTop 5 strongest connections:")
    top_edges = sorted(edges, key=lambda x: x['weight'], reverse=True)[:5]
    for edge in top_edges:
        # Get labels for source and target
        source_label = next((n['label'] for n in nodes if n['id'] == edge['source']), edge['source'])
        target_label = next((n['label'] for n in nodes if n['id'] == edge['target']), edge['target'])
        print(f"  {source_label} <-> {target_label}: {edge['weight']}")

    print(f"\nOutput file: {output_path}")
    print("=" * 50)

    return combined


if __name__ == '__main__':
    main()
