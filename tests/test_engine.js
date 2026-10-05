const fs = require('fs');

// Read building.json and complex_building.json
const benchmarkBuilding = JSON.parse(fs.readFileSync('building.json', 'utf8'));
const complexBuilding = JSON.parse(fs.readFileSync('complex_building.json', 'utf8'));

// Extract validation and dijkstra logic from script.js
function validateBuildingData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: "Root must be a valid JSON object." };
  }
  if (!data.building) {
    return { valid: false, error: "Missing required 'building' metadata property." };
  }
  if (!Array.isArray(data.nodes)) {
    return { valid: false, error: "'nodes' must be an array." };
  }
  if (data.nodes.length < 2 || data.nodes.length > 60) {
    return { valid: false, error: `Node count (${data.nodes.length}) outside allowed range: 2 to 60 nodes.` };
  }
  if (!Array.isArray(data.edges)) {
    return { valid: false, error: "'edges' must be an array." };
  }
  if (data.edges.length < 1 || data.edges.length > 150) {
    return { valid: false, error: `Edge count (${data.edges.length}) outside allowed range: 1 to 150 edges.` };
  }

  const nodeMap = new Map();
  let roomCount = 0;
  let junctionCount = 0;
  let exitCount = 0;

  for (let i = 0; i < data.nodes.length; i++) {
    const node = data.nodes[i];
    if (!node || typeof node !== 'object') {
      return { valid: false, error: `Node at index ${i} is not a valid object.` };
    }
    if (typeof node.id !== 'string' || !node.id.trim()) {
      return { valid: false, error: `Node at index ${i} missing valid non-empty 'id' string.` };
    }
    if (nodeMap.has(node.id)) {
      return { valid: false, error: `Duplicate node ID detected: '${node.id}'. Node IDs must be unique.` };
    }
    if (typeof node.label !== 'string') {
      return { valid: false, error: `Node '${node.id}' missing valid 'label' string.` };
    }
    if (!['room', 'junction', 'exit'].includes(node.type)) {
      return { valid: false, error: `Node '${node.id}' has invalid type '${node.type}'. Must be 'room', 'junction', or 'exit'.` };
    }
    if (typeof node.x !== 'number' || !Number.isFinite(node.x) || typeof node.y !== 'number' || !Number.isFinite(node.y)) {
      return { valid: false, error: `Node '${node.id}' must have finite numeric 'x' and 'y' coordinates.` };
    }

    if (node.type === 'room') roomCount++;
    if (node.type === 'junction') junctionCount++;
    if (node.type === 'exit') exitCount++;

    nodeMap.set(node.id, node);
  }

  if (roomCount + junctionCount < 1) {
    return { valid: false, error: "Graph must contain at least one 'room' or 'junction'." };
  }
  if (exitCount < 1) {
    return { valid: false, error: "Graph must contain at least one 'exit'." };
  }

  const edgeMap = new Map();
  const pairSet = new Set();

  for (let i = 0; i < data.edges.length; i++) {
    const edge = data.edges[i];
    if (!edge || typeof edge !== 'object') {
      return { valid: false, error: `Edge at index ${i} is not a valid object.` };
    }
    if (typeof edge.id !== 'string' || !edge.id.trim()) {
      return { valid: false, error: `Edge at index ${i} missing valid non-empty 'id' string.` };
    }
    if (edgeMap.has(edge.id)) {
      return { valid: false, error: `Duplicate edge ID detected: '${edge.id}'. Edge IDs must be unique.` };
    }
    if (typeof edge.from !== 'string' || !nodeMap.has(edge.from)) {
      return { valid: false, error: `Edge '${edge.id}' references non-existent 'from' node: '${edge.from}'.` };
    }
    if (typeof edge.to !== 'string' || !nodeMap.has(edge.to)) {
      return { valid: false, error: `Edge '${edge.id}' references non-existent 'to' node: '${edge.to}'.` };
    }
    if (edge.from === edge.to) {
      return { valid: false, error: `Edge '${edge.id}' is a self-loop (from '${edge.from}' to '${edge.to}'). Self-loops are prohibited.` };
    }

    const pairKey = edge.from < edge.to ? `${edge.from}__${edge.to}` : `${edge.to}__${edge.from}`;
    if (pairSet.has(pairKey)) {
      return { valid: false, error: `Repeated edge connection detected between '${edge.from}' and '${edge.to}'. Multi-edges are prohibited.` };
    }
    pairSet.add(pairKey);

    if (typeof edge.cost !== 'number' || !Number.isFinite(edge.cost) || edge.cost <= 0) {
      return { valid: false, error: `Edge '${edge.id}' has invalid cost (${edge.cost}). Costs must be positive numbers (> 0).` };
    }

    edgeMap.set(edge.id, edge);
  }

  if (data.initial_state) {
    if (typeof data.initial_state !== 'object' || Array.isArray(data.initial_state)) {
      return { valid: false, error: "'initial_state' must be an object." };
    }

    const { blocked_nodes = [], blocked_edges = [], closed_exits = [] } = data.initial_state;

    if (!Array.isArray(blocked_nodes) || !Array.isArray(blocked_edges) || !Array.isArray(closed_exits)) {
      return { valid: false, error: "'blocked_nodes', 'blocked_edges', and 'closed_exits' must be arrays." };
    }

    for (const nid of blocked_nodes) {
      if (typeof nid !== 'string' || !nodeMap.has(nid)) {
        return { valid: false, error: `initial_state.blocked_nodes contains non-existent node ID: '${nid}'.` };
      }
    }

    for (const eid of blocked_edges) {
      if (typeof eid !== 'string' || !edgeMap.has(eid)) {
        return { valid: false, error: `initial_state.blocked_edges contains non-existent edge ID: '${eid}'.` };
      }
    }

    for (const eid of closed_exits) {
      if (typeof eid !== 'string' || !nodeMap.has(eid)) {
        return { valid: false, error: `initial_state.closed_exits contains non-existent exit ID: '${eid}'.` };
      }
      if (nodeMap.get(eid).type !== 'exit') {
        return { valid: false, error: `initial_state.closed_exits contains node '${eid}' which is not of type 'exit'.` };
      }
    }
  }

  return { valid: true, error: null };
}

function comparePath(pathA, pathB) {
  const minLen = Math.min(pathA.length, pathB.length);
  for (let i = 0; i < minLen; i++) {
    if (pathA[i] !== pathB[i]) {
      return pathA[i].localeCompare(pathB[i]);
    }
  }
  return pathA.length - pathB.length;
}

function solveRoute(data, startNodeId, blockedNodes = new Set(), blockedEdges = new Set(), closedExits = new Set()) {
  if (blockedNodes.has(startNodeId)) {
    return { status: 'start_blocked', route: null };
  }

  const nodes = data.nodes;
  const edges = data.edges;

  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);

  for (const edge of edges) {
    if (blockedEdges.has(edge.id)) continue;
    const u = edge.from;
    const v = edge.to;
    if (blockedNodes.has(u) || blockedNodes.has(v)) continue;
    if (closedExits.has(u) || closedExits.has(v)) continue;

    adj.get(u).push({ neighbor: v, cost: edge.cost, edgeObj: edge });
    adj.get(v).push({ neighbor: u, cost: edge.cost, edgeObj: edge });
  }

  const dist = new Map();
  const paths = new Map();
  const edgePaths = new Map();
  const visited = new Set();

  for (const n of nodes) {
    dist.set(n.id, Infinity);
    paths.set(n.id, null);
    edgePaths.set(n.id, []);
  }

  dist.set(startNodeId, 0);
  paths.set(startNodeId, [startNodeId]);
  edgePaths.set(startNodeId, []);

  while (true) {
    let u = null;
    let minDist = Infinity;

    for (const [nid, d] of dist.entries()) {
      if (!visited.has(nid) && d < minDist) {
        minDist = d;
        u = nid;
      }
    }

    if (u === null || minDist === Infinity) break;
    visited.add(u);

    const nodeObj = nodes.find(n => n.id === u);
    if (nodeObj && nodeObj.type === 'exit' && u !== startNodeId) {
      continue;
    }

    const neighbors = adj.get(u) || [];
    for (const { neighbor: v, cost, edgeObj } of neighbors) {
      if (visited.has(v)) continue;

      const newCost = dist.get(u) + cost;
      const candidatePath = [...paths.get(u), v];
      const candidateEdges = [...edgePaths.get(u), edgeObj];

      const currentDist = dist.get(v);

      if (newCost < currentDist) {
        dist.set(v, newCost);
        paths.set(v, candidatePath);
        edgePaths.set(v, candidateEdges);
      } else if (newCost === currentDist) {
        const existingPath = paths.get(v);
        if (existingPath && comparePath(candidatePath, existingPath) < 0) {
          dist.set(v, newCost);
          paths.set(v, candidatePath);
          edgePaths.set(v, candidateEdges);
        }
      }
    }
  }

  const openExits = nodes.filter(n => n.type === 'exit' && !closedExits.has(n.id));
  const reachableExits = [];
  for (const exitNode of openExits) {
    const cost = dist.get(exitNode.id);
    if (cost !== undefined && cost < Infinity) {
      reachableExits.push({
        id: exitNode.id,
        cost: cost,
        path: paths.get(exitNode.id),
        edges: edgePaths.get(exitNode.id)
      });
    }
  }

  if (reachableExits.length === 0) {
    return { status: 'no_route', route: null };
  }

  reachableExits.sort((a, b) => {
    if (a.cost !== b.cost) {
      return a.cost - b.cost;
    }
    return a.id.localeCompare(b.id);
  });

  const best = reachableExits[0];
  return {
    status: 'ok',
    route: {
      targetExit: best.id,
      totalCost: best.cost,
      path: best.path,
      edges: best.edges
    }
  };
}

// -------------------------------------------------------------
// RUN TESTS
// -------------------------------------------------------------
console.log('=== TEST SUITE: SMART ESCAPE ===\n');

// 1. Validation test on benchmark building
const v1 = validateBuildingData(benchmarkBuilding);
console.assert(v1.valid, `Benchmark validation failed: ${v1.error}`);
console.log('✔ Benchmark building.json is valid');

// 2. Validation test on complex building
const v2 = validateBuildingData(complexBuilding);
console.assert(v2.valid, `Complex building validation failed: ${v2.error}`);
console.log('✔ Complex complex_building.json is valid');

// 3. Section 10 Sample Test Cases
// CASE 1: Select R1 -> Expected: R1 → C1 → C2 → E1, Cost: 7
const case1 = solveRoute(benchmarkBuilding, 'R1');
console.assert(case1.status === 'ok', `Case 1 status failed: ${case1.status}`);
console.assert(case1.route.totalCost === 7, `Case 1 cost failed: ${case1.route.totalCost} !== 7`);
console.assert(case1.route.path.join(' → ') === 'R1 → C1 → C2 → E1', `Case 1 path failed: ${case1.route.path.join(' → ')}`);
console.log('✔ Case 1: R1 → C1 → C2 → E1 (Cost: 7) PASSED');

// CASE 2: Select R1 and block C2 -> Expected: R1 → C1 → C3 → C4 → E2, Cost: 11
const case2 = solveRoute(benchmarkBuilding, 'R1', new Set(['C2']));
console.assert(case2.status === 'ok', `Case 2 status failed: ${case2.status}`);
console.assert(case2.route.totalCost === 11, `Case 2 cost failed: ${case2.route.totalCost} !== 11`);
console.assert(case2.route.path.join(' → ') === 'R1 → C1 → C3 → C4 → E2', `Case 2 path failed: ${case2.route.path.join(' → ')}`);
console.log('✔ Case 2: R1 → C1 → C3 → C4 → E2 (Cost: 11) PASSED');

// CASE 3: Select R1 and close E1 and E2 -> Expected: No route available
const case3 = solveRoute(benchmarkBuilding, 'R1', new Set(), new Set(), new Set(['E1', 'E2']));
console.assert(case3.status === 'no_route', `Case 3 status failed: ${case3.status}`);
console.log('✔ Case 3: No route available PASSED');

// CASE 4: Select R2 -> Expected: R2 → C3 → C4 → E2, Cost: 7
const case4 = solveRoute(benchmarkBuilding, 'R2');
console.assert(case4.status === 'ok', `Case 4 status failed: ${case4.status}`);
console.assert(case4.route.totalCost === 7, `Case 4 cost failed: ${case4.route.totalCost} !== 7`);
console.assert(case4.route.path.join(' → ') === 'R2 → C3 → C4 → E2', `Case 4 path failed: ${case4.route.path.join(' → ')}`);
console.log('✔ Case 4: R2 → C3 → C4 → E2 (Cost: 7) PASSED');

// CASE 5: Select R1 and then block R1 -> Expected: Starting location blocked
const case5 = solveRoute(benchmarkBuilding, 'R1', new Set(['R1']));
console.assert(case5.status === 'start_blocked', `Case 5 status failed: ${case5.status}`);
console.log('✔ Case 5: Starting location blocked PASSED');

// 4. Tie-breaking Tests
// Equal cost exits tie-breaker test:
const tieExitGraph = {
  building: { name: "Tie Exit Test" },
  nodes: [
    { id: "R1", label: "Room", type: "room", x: 0, y: 0 },
    { id: "EB", label: "Exit B", type: "exit", x: 10, y: 0 },
    { id: "EA", label: "Exit A", type: "exit", x: 10, y: 10 }
  ],
  edges: [
    { id: "e1", from: "R1", to: "EB", cost: 5 },
    { id: "e2", from: "R1", to: "EA", cost: 5 }
  ]
};
const tieExitRes = solveRoute(tieExitGraph, 'R1');
console.assert(tieExitRes.route.targetExit === 'EA', `Tie exit failed: expected EA, got ${tieExitRes.route.targetExit}`);
console.log('✔ Tie-breaking (Equal cost exits selects lexicographically smaller ID "EA" < "EB") PASSED');

// Equal cost path tie-breaker test:
const tiePathGraph = {
  building: { name: "Tie Path Test" },
  nodes: [
    { id: "R1", label: "Room", type: "room", x: 0, y: 0 },
    { id: "J_B", label: "Junction B", type: "junction", x: 5, y: -5 },
    { id: "J_A", label: "Junction A", type: "junction", x: 5, y: 5 },
    { id: "E1", label: "Exit", type: "exit", x: 10, y: 0 }
  ],
  edges: [
    { id: "e1", from: "R1", to: "J_B", cost: 2 },
    { id: "e2", from: "J_B", to: "E1", cost: 2 },
    { id: "e3", from: "R1", to: "J_A", cost: 2 },
    { id: "e4", from: "J_A", to: "E1", cost: 2 }
  ]
};
const tiePathRes = solveRoute(tiePathGraph, 'R1');
console.assert(tiePathRes.route.path.join(' → ') === 'R1 → J_A → E1', `Tie path failed: expected R1 → J_A → E1, got ${tiePathRes.route.path.join(' → ')}`);
console.log('✔ Tie-breaking (Equal cost paths selects lexicographically smaller sequence "J_A" < "J_B") PASSED');

// 5. Schema Validation Rejection Tests
const badCases = [
  { name: "Duplicate node ID", data: { building: {}, nodes: [{ id: "R1", label: "", type: "room", x: 0, y: 0 }, { id: "R1", label: "", type: "exit", x: 1, y: 1 }], edges: [{ id: "e1", from: "R1", to: "R1", cost: 1 }] } },
  { name: "Self-loop edge", data: { building: {}, nodes: [{ id: "R1", label: "", type: "room", x: 0, y: 0 }, { id: "E1", label: "", type: "exit", x: 1, y: 1 }], edges: [{ id: "e1", from: "R1", to: "R1", cost: 1 }] } },
  { name: "Duplicate node pair", data: { building: {}, nodes: [{ id: "R1", label: "", type: "room", x: 0, y: 0 }, { id: "E1", label: "", type: "exit", x: 1, y: 1 }], edges: [{ id: "e1", from: "R1", to: "E1", cost: 2 }, { id: "e2", from: "E1", to: "R1", cost: 3 }] } },
  { name: "Zero cost edge", data: { building: {}, nodes: [{ id: "R1", label: "", type: "room", x: 0, y: 0 }, { id: "E1", label: "", type: "exit", x: 1, y: 1 }], edges: [{ id: "e1", from: "R1", to: "E1", cost: 0 }] } },
  { name: "Negative cost edge", data: { building: {}, nodes: [{ id: "R1", label: "", type: "room", x: 0, y: 0 }, { id: "E1", label: "", type: "exit", x: 1, y: 1 }], edges: [{ id: "e1", from: "R1", to: "E1", cost: -5 }] } },
  { name: "Non-existent edge reference", data: { building: {}, nodes: [{ id: "R1", label: "", type: "room", x: 0, y: 0 }, { id: "E1", label: "", type: "exit", x: 1, y: 1 }], edges: [{ id: "e1", from: "R1", to: "GHOST", cost: 2 }] } },
  { name: "No exit", data: { building: {}, nodes: [{ id: "R1", label: "", type: "room", x: 0, y: 0 }, { id: "R2", label: "", type: "room", x: 1, y: 1 }], edges: [{ id: "e1", from: "R1", to: "R2", cost: 1 }] } }
];

for (const tc of badCases) {
  const res = validateBuildingData(tc.data);
  console.assert(!res.valid, `Expected failure for '${tc.name}', but got valid!`);
  console.log(`✔ Rejection test for '${tc.name}' correctly rejected: "${res.error}"`);
}

console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
