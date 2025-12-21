"""
Calculate 3D positions for LOTR Knowledge Graph using force-directed layout
Required for A-Frame visualization - nodes need pre-computed x,y,z coordinates

This script uses the same force-directed principles as the Vis.js Barnes-Hut solver
to ensure consistent node positioning between 2D and 3D views.

Run from src/data/ directory:
    python calculate_positions.py
"""

import json
import numpy as np
import sys
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.resolve()

def force_directed_3d(nodes, edges, iterations=500, verbose=True):
    """
    Force-directed graph layout in 3D space
    Based on Fruchterman-Reingold algorithm
    
    Args:
        nodes: List of node dictionaries with 'id' field
        edges: List of edge dictionaries with 'source', 'target', 'weight' fields
        iterations: Number of simulation steps
        verbose: Print progress
    
    Returns:
        positions: numpy array of shape (n_nodes, 3) with x,y,z coordinates
    """
    n = len(nodes)
    
    # Initialize positions randomly in a sphere
    positions = np.random.randn(n, 3) * 5
    
    # Create node ID to index mapping
    id_to_idx = {node['id']: i for i, node in enumerate(nodes)}
    
    # Convert edges to index pairs
    edge_pairs = []
    edge_weights = []
    for edge in edges:
        source_idx = id_to_idx.get(edge['source'])
        target_idx = id_to_idx.get(edge['target'])
        if source_idx is not None and target_idx is not None:
            edge_pairs.append((source_idx, target_idx))
            edge_weights.append(edge['weight'])
    
    # Normalize weights to 0-1 range
    max_weight = max(edge_weights) if edge_weights else 1
    edge_weights = [w / max_weight for w in edge_weights]
    
    # Force parameters
    area = 100.0  # Nominal area
    k = np.sqrt(area / n)  # Optimal distance between nodes
    temperature = 10.0  # Initial "temperature" for annealing
    
    if verbose:
        print(f"Calculating layout for {n} nodes, {len(edge_pairs)} edges...")
        print(f"Optimal distance k = {k:.2f}")
    
    for iteration in range(iterations):
        # Calculate repulsive forces between all pairs
        displacements = np.zeros((n, 3))
        
        for i in range(n):
            for j in range(i + 1, n):
                delta = positions[i] - positions[j]
                distance = np.linalg.norm(delta)
                
                if distance > 0:
                    # Repulsive force: F_r = k^2 / d
                    force = (k * k) / distance
                    direction = delta / distance
                    displacements[i] += direction * force
                    displacements[j] -= direction * force
        
        # Calculate attractive forces for connected nodes
        for (i, j), weight in zip(edge_pairs, edge_weights):
            delta = positions[j] - positions[i]
            distance = np.linalg.norm(delta)
            
            if distance > 0:
                # Attractive force: F_a = d^2 / k
                # Weighted by edge weight (stronger connections pull more)
                force = (distance * distance / k) * (0.5 + 0.5 * weight)
                direction = delta / distance
                displacements[i] += direction * force
                displacements[j] -= direction * force
        
        # Apply displacements with temperature (simulated annealing)
        for i in range(n):
            displacement_length = np.linalg.norm(displacements[i])
            if displacement_length > 0:
                # Limit displacement by current temperature
                positions[i] += (displacements[i] / displacement_length) * min(displacement_length, temperature)
        
        # Cool down (reduce temperature)
        temperature *= 0.98
        
        # Progress
        if verbose and (iteration + 1) % 100 == 0:
            avg_displacement = np.mean([np.linalg.norm(d) for d in displacements])
            print(f"  Iteration {iteration + 1}/{iterations}, temp={temperature:.2f}, avg_disp={avg_displacement:.2f}")
    
    return positions


def normalize_positions(positions, target_range=15):
    """
    Normalize positions to fit within ±target_range units
    Good for VR viewing (e.g., ±15 meters)
    """
    # Find max absolute coordinate
    max_coord = np.max(np.abs(positions))
    
    # Scale to target range
    if max_coord > 0:
        scale_factor = target_range / max_coord
        positions = positions * scale_factor
    
    return positions


def main():
    print("=" * 50)
    print("3D Position Calculator for A-Frame")
    print("=" * 50)

    try:
        # Load processed graph data
        input_path = SCRIPT_DIR / 'lotr_graph.json'
        print(f"\n[1/4] Loading graph data from: {input_path}")

        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        nodes = data['nodes']
        edges = data['links']

        print(f"  Loaded {len(nodes)} nodes and {len(edges)} edges")

        # Calculate 3D positions
        print("\n[2/4] Running force-directed algorithm...")
        positions = force_directed_3d(nodes, edges, iterations=500, verbose=True)

        # Normalize to VR-friendly range
        print("\n[3/4] Normalizing positions for VR...")
        positions = normalize_positions(positions, target_range=15)

        # Add positions to node data
        for i, node in enumerate(nodes):
            node['x'] = float(positions[i, 0])
            node['y'] = float(positions[i, 1])
            node['z'] = float(positions[i, 2])

        # Calculate statistics
        x_coords = [n['x'] for n in nodes]
        y_coords = [n['y'] for n in nodes]
        z_coords = [n['z'] for n in nodes]

        print("\n" + "=" * 50)
        print("POSITION STATISTICS")
        print("=" * 50)
        print(f"X range: [{min(x_coords):.2f}, {max(x_coords):.2f}]")
        print(f"Y range: [{min(y_coords):.2f}, {max(y_coords):.2f}]")
        print(f"Z range: [{min(z_coords):.2f}, {max(z_coords):.2f}]")

        # Calculate average distance between connected nodes
        connected_distances = []
        for edge in edges:
            source = next(n for n in nodes if n['id'] == edge['source'])
            target = next(n for n in nodes if n['id'] == edge['target'])
            dist = np.sqrt(
                (source['x'] - target['x'])**2 +
                (source['y'] - target['y'])**2 +
                (source['z'] - target['z'])**2
            )
            connected_distances.append(dist)

        print(f"Average edge length: {np.mean(connected_distances):.2f} units")
        print(f"Min edge length: {min(connected_distances):.2f} units")
        print(f"Max edge length: {max(connected_distances):.2f} units")

        # Show where main characters ended up
        print("\nMain character positions:")
        main_chars = ['frod', 'sams', 'ganda', 'arag', 'lego', 'gimli']
        for char_id in main_chars:
            char = next((n for n in nodes if n['id'] == char_id), None)
            if char:
                print(f"  {char['label']}: ({char['x']:.1f}, {char['y']:.1f}, {char['z']:.1f})")

        # Save positioned graph
        print("\n[4/4] Saving positioned graph...")
        output = {
            'metadata': {
                'description': 'LOTR Character Network with 3D Positions',
                'algorithm': 'force-directed-3d (Fruchterman-Reingold)',
                'iterations': 500,
                'position_range': '±15 units (VR-optimized)',
                'node_count': len(nodes),
                'edge_count': len(edges),
                'average_edge_length': float(np.mean(connected_distances))
            },
            'nodes': nodes,
            'links': edges
        }

        output_path = SCRIPT_DIR / 'lotr_positioned.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2)

        print(f"\nOutput file: {output_path}")
        print("=" * 50)
        print("SUCCESS! Ready for A-Frame visualization!")
        print("=" * 50)

        return 0

    except FileNotFoundError as e:
        print(f"\nERROR: Could not find input file: {e}")
        print("Make sure you've run data_processor.py first to create lotr_graph.json")
        return 1

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
