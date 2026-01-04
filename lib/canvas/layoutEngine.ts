import dagre from 'dagre';
import type { BlockNode, FlowEdge } from './types';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 120;
const HORIZONTAL_SPACING = 100;
const VERTICAL_SPACING = 80;

/**
 * Apply automatic layout to nodes and edges using dagre
 * This function modifies the nodes array in-place with new positions
 */
export function smartLayout(nodes: BlockNode[], edges: FlowEdge[]): void {
  if (nodes.length === 0) return;

  // Create a new dagre graph
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'LR', // Left to Right layout
    nodesep: HORIZONTAL_SPACING,
    ranksep: VERTICAL_SPACING,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to the graph
  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  // Calculate the layout
  dagre.layout(graph);

  // Update node positions based on dagre layout
  nodes.forEach((node) => {
    const nodeWithPosition = graph.node(node.id);
    if (nodeWithPosition) {
      // Center the node position (dagre gives top-left corner)
      node.position = {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      };
    }
  });
}

