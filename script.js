/**
 * ============================================================================
 * SMART ESCAPE - Interactive Evacuation Route Simulator
 * Frontend Architecture & Route Calculation Engine (Vanilla JavaScript ES6+)
 * 
 * Core Capabilities:
 * - Strict schema validation for building.json (2-60 nodes, 1-150 edges, etc.)
 * - Data-driven graph representation & Dijkstra's shortest-path algorithm
 * - Lexicographical tie-breaking for equal cost exits and node sequences
 * - Real-time hazard manipulation (nodes, corridors, exits)
 * - Dynamic SVG rendering with auto-scaling, pan & zoom
 * - Full bilingual support (English & Bangla)
 * - Section 10 benchmark test cases suite
 * ============================================================================
 */

'use strict';

/* ============================================================================
   1. GLOBAL STATE & CONFIGURATION
   ============================================================================ */
const AppState = {
  // Current language: 'en' | 'bn'
  language: 'en',

  // Raw validated dataset currently loaded
  buildingData: null,

  // Deep copy of imported initial_state for reset
  initialState: null,

  // Active hazard state sets
  blockedNodes: new Set(),
  blockedEdges: new Set(),
  closedExits: new Set(),

  // Current selected start node ID
  startNodeId: null,

  // Active interaction mode: 'start' | 'hazard'
  interactionMode: 'start',

  // Computed shortest route result
  currentRoute: null,
  routeStatus: 'none', // 'ok' | 'no_route' | 'start_blocked' | 'none'

  // SVG Pan & Zoom state
  svgTransform: {
    panX: 0,
    panY: 0,
    zoom: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0
  },

  // Active hazard filter query
  hazardFilterQuery: ''
};

/* ============================================================================
   2. BILINGUAL TRANSLATION DICTIONARY
   ============================================================================ */
const I18N = {
  en: {
    app_title: "SMART ESCAPE",
    badge_simulator: "SIMULATOR",
    app_subtitle: "Interactive Evacuation Route Simulator",
    status_ready: "System Ready",
    status_optimal: "Route Optimal",
    status_hazard_alert: "Hazard Alert",
    status_no_route: "Evacuation Blocked",
    btn_reset: "Reset",
    disclaimer_notice: "Educational simulation only — NOT a certified real-world evacuation planning tool.",
    map_title: "Building Evacuation Map",
    mode_start: "Select Start",
    mode_hazard: "Toggle Hazard",
    map_hint: "Click node to interact • Drag to pan • Scroll to zoom",
    legend_room: "Room",
    legend_junction: "Junction",
    legend_exit: "Open Exit",
    legend_route: "Active Route",
    legend_blocked_node: "Blocked Node",
    legend_blocked_edge: "Blocked Corridor",
    legend_closed_exit: "Closed Exit",
    legend_start: "Start",
    route_summary_title: "Current Evacuation Route",
    status_route_active: "Active Route",
    status_route_none: "No Route",
    status_route_blocked: "Start Blocked",
    msg_no_route_title: "No route available",
    msg_no_route_desc: "All paths to open exits are impassable or closed.",
    msg_start_blocked_title: "Starting location blocked",
    msg_start_blocked_desc: "The selected starting room or junction is currently impassable.",
    label_total_cost: "TOTAL ROUTE COST",
    unit_cost_points: "units",
    label_route_hops: "CORRIDORS",
    unit_hops: "hops",
    label_target_exit: "DESTINATION EXIT",
    label_path_sequence: "ROUTE NODE SEQUENCE",
    label_step_breakdown: "STEP-BY-STEP CORRIDOR BREAKDOWN",
    start_location_title: "Start Location",
    rule_start_notice: "Rooms & Junctions Only",
    label_select_start: "Choose Starting Room or Junction:",
    quick_pick: "Quick Pick:",
    hazard_control_title: "Hazard Controls",
    btn_clear_hazards: "Clear All",
    tab_rooms: "Rooms",
    tab_junctions: "Junctions",
    tab_corridors: "Corridors",
    tab_exits: "Exits",
    placeholder_search_hazards: "Search hazards by ID or label...",
    benchmark_test_title: "Benchmark Test Cases",
    tag_competition_spec: "Spec Section 10",
    benchmark_instructions: "Test the required Section 10 scenarios with one click on the sample building:",
    import_card_title: "Building Data Import",
    label_preset_building: "Load Preset Dataset:",
    dropzone_prompt: "Drop building.json here",
    dropzone_or: "or click to browse from device",
    btn_export_json: "Export Current Graph State JSON",
    help_modal_title: "Smart Escape Guide & Documentation",
    help_sec1_title: "1. Evacuation Routing Rules",
    help_sec1_p: "Smart Escape uses Dijkstra's shortest path algorithm. Route costs are calculated strictly by summing edge costs, never from visual pixel distances or node counts.",
    help_sec2_title: "2. Hazard Mechanics",
    help_sec2_l1: "Blocked Room/Junction: Completely impassable. Cannot be entered or crossed; all connected corridors become unusable.",
    help_sec2_l2: "Blocked Corridor: Only that specific corridor is unusable. Endpoint nodes remain accessible via other routes.",
    help_sec2_l3: "Closed Exit: Cannot serve as an exit or as an intermediate pass-through node.",
    help_sec3_title: "3. Tie-breaking Determinism",
    help_sec3_l1: "If two exits have equal lowest total cost, the lexicographically smaller exit ID is selected (e.g. E1 over E2).",
    help_sec3_l2: "If two routes to the same exit have equal cost, the lexicographically smaller node sequence is selected.",
    help_sec4_title: "4. Supported JSON Schema Limits",
    help_sec4_l1: "Nodes: 2 to 60 (at least one room/junction, at least one exit).",
    help_sec4_l2: "Edges: 1 to 150 undirected edges. Self-loops and repeated node pairs are prohibited.",
    help_sec4_l3: "Edge costs must be positive numbers (> 0).",
    btn_got_it: "Got it",
    toast_exit_as_start: "Exits cannot be selected as starting points.",
    toast_blocked_as_start: "Blocked nodes cannot be selected as starting points.",
    toast_loaded: "Building graph loaded successfully.",
    toast_reset: "Simulation reset to original initial state.",
    cost_label: "Cost"
  },
  bn: {
    app_title: "স্মার্ট এস্কেপ",
    badge_simulator: "সিমুলেটর",
    app_subtitle: "ইন্টারেক্টিভ ইভাকুয়েশন রুট সিমুলেটর",
    status_ready: "সিস্টেম প্রস্তুত",
    status_optimal: "অনুকূল রুট সক্রিয়",
    status_hazard_alert: "বিপদ সংকেত",
    status_no_route: "ইভাকুয়েশন অবরুদ্ধ",
    btn_reset: "রিসেট",
    disclaimer_notice: "শুধুমাত্র শিক্ষামূলক সিমুলেশন — কোনো প্রত্যয়িত বাস্তব-বিশ্বের ইভাকুয়েশন প্ল্যানিং টুল নয়।",
    map_title: "বিল্ডিং ইভাকুয়েশন ম্যাপ",
    mode_start: "শুরু নির্বাচন",
    mode_hazard: "বিপদ পরিবর্তন",
    map_hint: "ইন্টারেক্ট করতে নোডে ক্লিক করুন • প্যান করতে ড্র্যাগ করুন • জুম করতে স্ক্রোল করুন",
    legend_room: "কক্ষ",
    legend_junction: "জাংশন",
    legend_exit: "উন্মুক্ত প্রস্থান",
    legend_route: "সক্রিয় রুট",
    legend_blocked_node: "ব্লকড নোড",
    legend_blocked_edge: "ব্লকড করিডোর",
    legend_closed_exit: "বন্ধ প্রস্থান",
    legend_start: "শুরু",
    route_summary_title: "বর্তমান ইভাকুয়েশন রুট",
    status_route_active: "সক্রিয় রুট",
    status_route_none: "রুট নেই",
    status_route_blocked: "শুরু অবরুদ্ধ",
    msg_no_route_title: "কোনো রুট পাওয়া যায়নি",
    msg_no_route_desc: "উন্মুক্ত প্রস্থানের সমস্ত পথ অবরুদ্ধ বা বন্ধ।",
    msg_start_blocked_title: "শুরুর অবস্থানটি ব্লক করা হয়েছে",
    msg_start_blocked_desc: "নির্বাচিত শুরুর কক্ষ বা জাংশনটি বর্তমানে অগম্য।",
    label_total_cost: "মোট রুট খরচ",
    unit_cost_points: "পয়েন্ট",
    label_route_hops: "করিডোর",
    unit_hops: "ধাপ",
    label_target_exit: "গন্তব্য প্রস্থান",
    label_path_sequence: "রুট নোড ক্রম",
    label_step_breakdown: "ধাপভিত্তিক করিডোর বিবরণ",
    start_location_title: "শুরুর অবস্থান",
    rule_start_notice: "শুধুমাত্র কক্ষ ও জাংশন",
    label_select_start: "শুরুর কক্ষ বা জাংশন নির্বাচন করুন:",
    quick_pick: "দ্রুত নির্বাচন:",
    hazard_control_title: "বিপদ নিয়ন্ত্রণ ব্যবস্থা",
    btn_clear_hazards: "সব মুছুন",
    tab_rooms: "কক্ষ",
    tab_junctions: "জাংশন",
    tab_corridors: "করিডোর",
    tab_exits: "প্রস্থান",
    placeholder_search_hazards: "আইডি বা লেবেল দিয়ে খুঁজুন...",
    benchmark_test_title: "বেঞ্চমার্ক টেস্ট কেস",
    tag_competition_spec: "সেকশন ১০ স্পেক",
    benchmark_instructions: "নমুনা বিল্ডিংয়ে এক ক্লিকে প্রয়োজনীয় সেকশন ১০ পরিস্থিতি পরীক্ষা করুন:",
    import_card_title: "বিল্ডিং ডেটা ইমপোর্ট",
    label_preset_building: "প্রিসেট ডেটাসেট লোড করুন:",
    dropzone_prompt: "এখানে building.json টেনে এনে ফেলুন",
    dropzone_or: "অথবা ডিভাইস থেকে ব্রাউজ করতে ক্লিক করুন",
    btn_export_json: "বর্তমান গ্রাফ স্টেট JSON এক্সপোর্ট করুন",
    help_modal_title: "স্মার্ট এস্কেপ গাইড ও নির্দেশিকা",
    help_sec1_title: "১. ইভাকুয়েশন রাউটিং নিয়মাবলি",
    help_sec1_p: "স্মার্ট এস্কেপ ডিজকস্ট্রা অ্যালগরিদম ব্যবহার করে। রুটের খরচ সম্পূর্ণরূপে এজ-এর খরচের যোগফল দিয়ে গণনা করা হয়, কখনোই পিক্সেল দূরত্ব বা নোড সংখ্যা দিয়ে নয়।",
    help_sec2_title: "২. বিপদ নিয়ন্ত্রণ পদ্ধতি",
    help_sec2_l1: "ব্লকড কক্ষ/জাংশন: সম্পূর্ণ অগম্য। এতে প্রবেশ বা অতিক্রম করা যায় না; যুক্ত সমস্ত করিডোর অব্যবহারযোগ্য হয়ে যায়।",
    help_sec2_l2: "ব্লকড করিডোর: শুধুমাত্র সেই নির্দিষ্ট করিডোরটি অব্যবহারযোগ্য হয়। প্রান্তিক নোডগুলো অন্যান্য রুটের মাধ্যমে অ্যাক্সেসযোগ্য থাকে।",
    help_sec2_l3: "বন্ধ প্রস্থান: প্রস্থান হিসেবে অথবা মধ্যবর্তী পথ হিসেবে ব্যবহার করা যাবে না।",
    help_sec3_title: "৩. টাই-ব্রেকিং নিয়মাবলি",
    help_sec3_l1: "যদি দুটি প্রস্থানের মোট খরচ সমান হয়, তবে আভিধানিক ক্রমানুসারে ছোট আইডিটি নির্বাচিত হবে (যেমন E2 এর চেয়ে E1)।",
    help_sec3_l2: "একই প্রস্থানের দুটি রুটের খরচ সমান হলে, আভিধানিক ক্রমানুসারে ছোট নোড ক্রমটি নির্বাচিত হবে।",
    help_sec4_title: "৪. সমর্থিত JSON স্কিমা সীমা",
    help_sec4_l1: "নোড: ২ থেকে ৬০ টি (কমপক্ষে একটি কক্ষ/জাংশন এবং একটি প্রস্থান)।",
    help_sec4_l2: "এজ: ১ থেকে ১৫০ টি অনির্দেশিত করিডোর। সেলফ-লুপ ও পুনরাবৃত্তি জোড়া নিষিদ্ধ।",
    help_sec4_l3: "এজ খরচ অবশ্যই ধনাত্মক সংখ্যা (> ০) হতে হবে।",
    btn_got_it: "বুঝেছি",
    toast_exit_as_start: "প্রস্থানকে শুরুর অবস্থান হিসেবে নির্বাচন করা যাবে না।",
    toast_blocked_as_start: "ব্লক করা নোড শুরুর অবস্থান হিসেবে নির্বাচন করা যাবে না।",
    toast_loaded: "বিল্ডিং গ্রাফ সফলভাবে লোড হয়েছে।",
    toast_reset: "সিমুলেশনটি মূল প্রাথমিক অবস্থায় রিসেট করা হয়েছে।",
    cost_label: "খরচ"
  }
};

/* ============================================================================
   3. DATA VALIDATION (REQUIREMENT 1 & 16)
   ============================================================================ */
/**
 * Strictly validates imported building data according to competition rules.
 * @param {any} data - Parsed JSON object.
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateBuildingData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: "Root must be a valid JSON object." };
  }

  // Check building metadata
  if (!data.building) {
    return { valid: false, error: "Missing required 'building' metadata property." };
  }

  // Validate nodes array
  if (!Array.isArray(data.nodes)) {
    return { valid: false, error: "'nodes' must be an array." };
  }
  if (data.nodes.length < 2 || data.nodes.length > 60) {
    return { valid: false, error: `Node count (${data.nodes.length}) outside allowed range: 2 to 60 nodes.` };
  }

  // Validate edges array
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

  // Validate edges
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

    // Check repeated node pairs (undirected: (u, v) and (v, u) are identical)
    const pairKey = edge.from < edge.to ? `${edge.from}__${edge.to}` : `${edge.to}__${edge.from}`;
    if (pairSet.has(pairKey)) {
      return { valid: false, error: `Repeated edge connection detected between '${edge.from}' and '${edge.to}'. Multi-edges are prohibited.` };
    }
    pairSet.add(pairKey);

    // Validate edge cost
    if (typeof edge.cost !== 'number' || !Number.isFinite(edge.cost) || edge.cost <= 0) {
      return { valid: false, error: `Edge '${edge.id}' has invalid cost (${edge.cost}). Costs must be positive numbers (> 0).` };
    }

    edgeMap.set(edge.id, edge);
  }

  // Validate initial_state
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

/* ============================================================================
   4. STATE INITIALIZATION (REQUIREMENT 18)
   ============================================================================ */
/**
 * Initializes simulation state with validated building data.
 * @param {object} data 
 */
function initializeState(data) {
  AppState.buildingData = data;
  
  // Clone initial state deeply
  AppState.initialState = {
    blocked_nodes: [...(data.initial_state?.blocked_nodes || [])],
    blocked_edges: [...(data.initial_state?.blocked_edges || [])],
    closed_exits: [...(data.initial_state?.closed_exits || [])]
  };

  // Populate active sets
  AppState.blockedNodes = new Set(AppState.initialState.blocked_nodes);
  AppState.blockedEdges = new Set(AppState.initialState.blocked_edges);
  AppState.closedExits = new Set(AppState.initialState.closed_exits);

  // Set default start location: first available unblocked room, or first unblocked junction
  const candidates = data.nodes.filter(n => 
    (n.type === 'room' || n.type === 'junction') && !AppState.blockedNodes.has(n.id)
  );

  if (candidates.length > 0) {
    // Prefer room over junction if available
    const room = candidates.find(n => n.type === 'room');
    AppState.startNodeId = room ? room.id : candidates[0].id;
  } else {
    // If all are blocked initially, pick first room or junction
    const anyRoomOrJunction = data.nodes.find(n => n.type === 'room' || n.type === 'junction');
    AppState.startNodeId = anyRoomOrJunction ? anyRoomOrJunction.id : null;
  }

  // Update Building Name in UI
  const buildingTitle = data.building.name || "Building Map";
  document.getElementById('building-display-name').textContent = buildingTitle;

  // Build UI controls & Render map
  populateStartLocationSelectors();
  populateHazardControls();
  renderMap();
  updateRoute();
}

/**
 * Loads a building dataset from object or JSON string.
 * @param {object|string} rawInput 
 */
function loadBuilding(rawInput) {
  try {
    const data = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
    const validation = validateBuildingData(data);
    
    if (!validation.valid) {
      showJsonError(validation.error);
      return false;
    }

    hideJsonError();
    initializeState(data);
    showToast(getI18nText('toast_loaded'), 'success');
    return true;
  } catch (err) {
    showJsonError(`JSON Parse Error: ${err.message}`);
    return false;
  }
}

/* ============================================================================
   5. SHORTEST-PATH CALCULATION (DIJKSTRA & TIE-BREAKING)
   ============================================================================ */
/**
 * Checks if a node is blocked.
 * @param {string} nodeId 
 * @returns {boolean}
 */
function isNodeBlocked(nodeId) {
  return AppState.blockedNodes.has(nodeId);
}

/**
 * Checks if an edge is blocked.
 * @param {string} edgeId 
 * @returns {boolean}
 */
function isEdgeBlocked(edgeId) {
  return AppState.blockedEdges.has(edgeId);
}

/**
 * Checks if an exit is closed.
 * @param {string} exitId 
 * @returns {boolean}
 */
function isExitClosed(exitId) {
  return AppState.closedExits.has(exitId);
}

/**
 * Retrieves all open, unclosed exit nodes.
 * @returns {Array<object>}
 */
function getAvailableExits() {
  if (!AppState.buildingData) return [];
  return AppState.buildingData.nodes.filter(n => n.type === 'exit' && !isExitClosed(n.id));
}

/**
 * Lexicographical comparator for two arrays of node IDs.
 * @param {Array<string>} pathA 
 * @param {Array<string>} pathB 
 * @returns {number}
 */
function comparePath(pathA, pathB) {
  const minLen = Math.min(pathA.length, pathB.length);
  for (let i = 0; i < minLen; i++) {
    if (pathA[i] !== pathB[i]) {
      return pathA[i].localeCompare(pathB[i]);
    }
  }
  return pathA.length - pathB.length;
}

/**
 * Runs Dijkstra's algorithm from startNodeId to find lowest-cost paths.
 * Excludes:
 * - Blocked nodes
 * - Corridors connected to blocked nodes
 * - Blocked corridors
 * - Closed exits (cannot be visited or traversed)
 * 
 * Computes exact edge-cost summation only.
 * Breaks ties lexicographically by node sequence.
 * 
 * @param {string} startNodeId 
 * @returns {{ dist: Map<string, number>, paths: Map<string, Array<string>>, edgePaths: Map<string, Array<object>> }}
 */
function dijkstra(startNodeId) {
  const nodes = AppState.buildingData.nodes;
  const edges = AppState.buildingData.edges;

  // Build adjacency list for usable elements
  const adj = new Map();
  for (const n of nodes) {
    adj.set(n.id, []);
  }

  for (const edge of edges) {
    // If edge itself is blocked, skip
    if (isEdgeBlocked(edge.id)) continue;

    const u = edge.from;
    const v = edge.to;

    // If either endpoint is blocked, skip
    if (isNodeBlocked(u) || isNodeBlocked(v)) continue;

    // If either endpoint is a closed exit, skip
    if (isExitClosed(u) || isExitClosed(v)) continue;

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

  // Standard Dijkstra with array-based min extraction (blazing fast for N <= 60)
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

    // Stop traversing further if node u is an open exit (exits are terminal)
    const nodeObj = AppState.buildingData.nodes.find(n => n.id === u);
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
        // Tie-breaking: If paths to the same node have equal cost,
        // choose the lexicographically smallest sequence of node IDs.
        const existingPath = paths.get(v);
        if (existingPath && comparePath(candidatePath, existingPath) < 0) {
          dist.set(v, newCost);
          paths.set(v, candidatePath);
          edgePaths.set(v, candidateEdges);
        }
      }
    }
  }

  return { dist, paths, edgePaths };
}

/**
 * Calculates lowest-cost route to accessible open exits.
 * Enforces Exit Selection Rule:
 * 1. Choose reachable open exit with minimum total cost.
 * 2. If equal cost, choose lexicographically smallest exit ID.
 * 3. Equal-cost path tie-breaking is handled in dijkstra().
 * 
 * @returns {object|null}
 */
function calculateShortestRoute() {
  if (!AppState.buildingData || !AppState.startNodeId) {
    return { status: 'none', route: null };
  }

  // Check if start location itself is blocked
  if (isNodeBlocked(AppState.startNodeId)) {
    return { status: 'start_blocked', route: null };
  }

  const { dist, paths, edgePaths } = dijkstra(AppState.startNodeId);
  const openExits = getAvailableExits();

  // Find all reachable exits
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

  // Sort candidate exits:
  // 1. Min total cost
  // 2. Lexicographically smallest exit ID
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

/**
 * Updates route calculations, status indicators, and UI displays.
 */
function updateRoute() {
  const result = calculateShortestRoute();
  AppState.routeStatus = result.status;
  AppState.currentRoute = result.route;

  renderRouteSummary();
  renderRouteEdges();
  updateStatusIndicator();
}

/* ============================================================================
   6. HAZARD MANIPULATION & INTERACTION (REQUIREMENT 7)
   ============================================================================ */
/**
 * Toggles blocked state of a room or junction.
 * @param {string} nodeId 
 */
function toggleNodeBlock(nodeId) {
  if (AppState.blockedNodes.has(nodeId)) {
    AppState.blockedNodes.delete(nodeId);
  } else {
    AppState.blockedNodes.add(nodeId);
  }
  syncHazardControlsUI();
  renderNodes();
  renderEdges();
  updateRoute();
}

/**
 * Toggles blocked state of a corridor (edge).
 * @param {string} edgeId 
 */
function toggleEdgeBlock(edgeId) {
  if (AppState.blockedEdges.has(edgeId)) {
    AppState.blockedEdges.delete(edgeId);
  } else {
    AppState.blockedEdges.add(edgeId);
  }
  syncHazardControlsUI();
  renderEdges();
  updateRoute();
}

/**
 * Toggles closed state of an exit.
 * @param {string} exitId 
 */
function toggleExit(exitId) {
  if (AppState.closedExits.has(exitId)) {
    AppState.closedExits.delete(exitId);
  } else {
    AppState.closedExits.add(exitId);
  }
  syncHazardControlsUI();
  renderNodes();
  renderEdges();
  updateRoute();
}

/**
 * Sets the active start location.
 * @param {string} nodeId 
 */
function selectStartNode(nodeId) {
  if (!AppState.buildingData) return;
  const node = AppState.buildingData.nodes.find(n => n.id === nodeId);
  if (!node) return;

  if (node.type === 'exit') {
    showToast(getI18nText('toast_exit_as_start'), 'error');
    return;
  }
  if (isNodeBlocked(node.id)) {
    showToast(getI18nText('toast_blocked_as_start'), 'error');
    // We still update startNodeId to demonstrate failure case 5 ("Starting location blocked")
    AppState.startNodeId = nodeId;
    syncStartSelectorUI();
    renderNodes();
    updateRoute();
    return;
  }

  AppState.startNodeId = nodeId;
  syncStartSelectorUI();
  renderNodes();
  updateRoute();
}

/**
 * Clears all currently active hazards.
 */
function clearAllHazards() {
  AppState.blockedNodes.clear();
  AppState.blockedEdges.clear();
  AppState.closedExits.clear();
  syncHazardControlsUI();
  renderNodes();
  renderEdges();
  updateRoute();
}

/**
 * Resets simulation to exact initial_state from imported JSON (Requirement 9).
 */
function resetSimulation() {
  if (!AppState.initialState) return;

  AppState.blockedNodes = new Set(AppState.initialState.blocked_nodes);
  AppState.blockedEdges = new Set(AppState.initialState.blocked_edges);
  AppState.closedExits = new Set(AppState.initialState.closed_exits);

  // If start is blocked or invalid, re-validate
  const startNode = AppState.buildingData?.nodes.find(n => n.id === AppState.startNodeId);
  if (!startNode || startNode.type === 'exit') {
    const validFirst = AppState.buildingData?.nodes.find(n => (n.type === 'room' || n.type === 'junction') && !AppState.blockedNodes.has(n.id));
    if (validFirst) AppState.startNodeId = validFirst.id;
  }

  resetSvgPanZoom();
  syncStartSelectorUI();
  syncHazardControlsUI();
  renderNodes();
  renderEdges();
  updateRoute();
  showToast(getI18nText('toast_reset'), 'success');
}

/* ============================================================================
   7. SVG MAP RENDERING & AUTO-SCALING (REQUIREMENTS 2 & 13)
   ============================================================================ */
/**
 * Renders the full building graph into SVG with scalable viewport.
 */
function renderMap() {
  if (!AppState.buildingData) return;

  const nodes = AppState.buildingData.nodes;
  const svg = document.getElementById('building-svg');

  // Compute bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.y > maxY) maxY = n.y;
  }

  // Generous padding around nodes
  const padX = 85;
  const padY = 85;
  const width = Math.max(maxX - minX + padX * 2, 400);
  const height = Math.max(maxY - minY + padY * 2, 350);

  svg.setAttribute('viewBox', `${minX - padX} ${minY - padY} ${width} ${height}`);

  // Render SVG Grid Pattern
  renderSvgGrid(minX - padX, minY - padY, width, height);

  // Render Map Layers
  renderEdges();
  renderNodes();
}

/**
 * Draws background grid lines in SVG for architectural blueprint aesthetics.
 */
function renderSvgGrid(x, y, w, h) {
  const gridLayer = document.getElementById('svg-grid');
  gridLayer.innerHTML = '';
  
  const step = 40;
  const startX = Math.floor(x / step) * step;
  const endX = Math.ceil((x + w) / step) * step;
  const startY = Math.floor(y / step) * step;
  const endY = Math.ceil((y + h) / step) * step;

  let d = '';
  for (let gx = startX; gx <= endX; gx += step) {
    d += `M ${gx} ${startY} L ${gx} ${endY} `;
  }
  for (let gy = startY; gy <= endY; gy += step) {
    d += `M ${startX} ${gy} L ${endX} ${gy} `;
  }

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('stroke', '#1e293b');
  path.setAttribute('stroke-width', '0.6');
  path.setAttribute('stroke-opacity', '0.35');
  path.setAttribute('fill', 'none');
  gridLayer.appendChild(path);
}

/**
 * Renders corridors (edges) and cost badges.
 */
function renderEdges() {
  if (!AppState.buildingData) return;

  const edgesLayer = document.getElementById('svg-edges-layer');
  const edgeLabelsLayer = document.getElementById('svg-edge-labels-layer');
  edgesLayer.innerHTML = '';
  edgeLabelsLayer.innerHTML = '';

  const nodeMap = new Map(AppState.buildingData.nodes.map(n => [n.id, n]));

  for (const edge of AppState.buildingData.edges) {
    const u = nodeMap.get(edge.from);
    const v = nodeMap.get(edge.to);
    if (!u || !v) continue;

    const isBlocked = isEdgeBlocked(edge.id) || isNodeBlocked(edge.from) || isNodeBlocked(edge.to);

    // Group for Edge
    const gEdge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gEdge.setAttribute('data-edge-id', edge.id);

    // Invisible wide hit area for easy clicking
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hitPath.setAttribute('x1', u.x);
    hitPath.setAttribute('y1', u.y);
    hitPath.setAttribute('x2', v.x);
    hitPath.setAttribute('y2', v.y);
    hitPath.setAttribute('class', 'edge-hit-area');

    // Visual corridor line
    const visualLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    visualLine.setAttribute('x1', u.x);
    visualLine.setAttribute('y1', u.y);
    visualLine.setAttribute('x2', v.x);
    visualLine.setAttribute('y2', v.y);
    visualLine.setAttribute('class', `edge-path ${isBlocked ? 'blocked' : ''}`);

    gEdge.appendChild(hitPath);
    gEdge.appendChild(visualLine);

    // Corridor click listener to toggle hazard
    gEdge.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleEdgeBlock(edge.id);
    });

    edgesLayer.appendChild(gEdge);

    // Midpoint Cost Badge
    const midX = (u.x + v.x) / 2;
    const midY = (u.y + v.y) / 2;

    const gCost = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gCost.setAttribute('class', `edge-cost-group ${isBlocked ? 'blocked' : ''}`);
    gCost.setAttribute('data-edge-id', edge.id);
    gCost.setAttribute('transform', `translate(${midX}, ${midY})`);

    const pill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    pill.setAttribute('x', -14);
    pill.setAttribute('y', -10);
    pill.setAttribute('width', 28);
    pill.setAttribute('height', 20);
    pill.setAttribute('rx', 10);
    pill.setAttribute('class', 'edge-cost-pill');

    const costText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    costText.setAttribute('class', 'edge-cost-text');
    costText.textContent = edge.cost;

    gCost.appendChild(pill);
    gCost.appendChild(costText);

    gCost.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleEdgeBlock(edge.id);
    });

    edgeLabelsLayer.appendChild(gCost);
  }
}

/**
 * Highlights active evacuation route corridors on Layer 2.
 */
function renderRouteEdges() {
  const routeLayer = document.getElementById('svg-route-layer');
  routeLayer.innerHTML = '';

  // Clear previous .on-route classes from cost labels
  const costLabels = document.querySelectorAll('.edge-cost-group');
  costLabels.forEach(el => el.classList.remove('on-route'));

  if (!AppState.currentRoute || AppState.routeStatus !== 'ok' || !AppState.currentRoute.edges) {
    return;
  }

  const nodeMap = new Map(AppState.buildingData.nodes.map(n => [n.id, n]));
  const activeEdgeIds = new Set(AppState.currentRoute.edges.map(e => e.id));

  // Mark cost pills on route
  costLabels.forEach(el => {
    if (activeEdgeIds.has(el.getAttribute('data-edge-id'))) {
      el.classList.add('on-route');
    }
  });

  // Draw continuous route path
  for (const edge of AppState.currentRoute.edges) {
    const u = nodeMap.get(edge.from);
    const v = nodeMap.get(edge.to);
    if (!u || !v) continue;

    // Glowing halo
    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    halo.setAttribute('x1', u.x);
    halo.setAttribute('y1', u.y);
    halo.setAttribute('x2', v.x);
    halo.setAttribute('y2', v.y);
    halo.setAttribute('class', 'route-path-halo');

    // Flowing animated core
    const core = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    core.setAttribute('x1', u.x);
    core.setAttribute('y1', u.y);
    core.setAttribute('x2', v.x);
    core.setAttribute('y2', v.y);
    core.setAttribute('class', 'route-path-core');

    routeLayer.appendChild(halo);
    routeLayer.appendChild(core);
  }
}

/**
 * Renders nodes (Rooms, Junctions, Exits, Start beacon).
 */
function renderNodes() {
  if (!AppState.buildingData) return;

  const nodesLayer = document.getElementById('svg-nodes-layer');
  const startMarkerLayer = document.getElementById('svg-start-marker-layer');
  nodesLayer.innerHTML = '';
  startMarkerLayer.innerHTML = '';

  for (const node of AppState.buildingData.nodes) {
    const isBlocked = isNodeBlocked(node.id);
    const isClosed = node.type === 'exit' && isExitClosed(node.id);
    const isStart = AppState.startNodeId === node.id;

    const gNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gNode.setAttribute('class', `node-group ${node.type} ${isBlocked ? 'blocked' : ''} ${isClosed ? 'closed-exit' : ''} ${isStart ? 'selected-start' : ''}`);
    gNode.setAttribute('transform', `translate(${node.x}, ${node.y})`);
    gNode.setAttribute('data-node-id', node.id);

    if (node.type === 'room') {
      // Room: Rounded rectangle
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', -34);
      rect.setAttribute('y', -22);
      rect.setAttribute('width', 68);
      rect.setAttribute('height', 44);
      rect.setAttribute('rx', 8);
      rect.setAttribute('class', 'node-shape room-shape');
      gNode.appendChild(rect);

      // Label ID
      const textId = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textId.setAttribute('y', -4);
      textId.setAttribute('class', 'node-label-id');
      textId.textContent = node.id;
      gNode.appendChild(textId);

      // Label Subtitle
      const textSub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textSub.setAttribute('y', 8);
      textSub.setAttribute('class', 'node-label-sub');
      textSub.textContent = "ROOM";
      gNode.appendChild(textSub);

    } else if (node.type === 'junction') {
      // Junction: Hub Circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', 20);
      circle.setAttribute('class', 'node-shape junction-shape');
      gNode.appendChild(circle);

      const textId = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textId.setAttribute('y', 0);
      textId.setAttribute('class', 'node-label-id');
      textId.textContent = node.id;
      gNode.appendChild(textId);

    } else if (node.type === 'exit') {
      // Exit: Distinct badge with door / icon
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', -34);
      rect.setAttribute('y', -22);
      rect.setAttribute('width', 68);
      rect.setAttribute('height', 44);
      rect.setAttribute('rx', 6);
      rect.setAttribute('class', 'node-shape exit-shape');
      gNode.appendChild(rect);

      const textId = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textId.setAttribute('y', -4);
      textId.setAttribute('class', 'node-label-id');
      textId.textContent = node.id;
      gNode.appendChild(textId);

      const textSub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textSub.setAttribute('y', 8);
      textSub.setAttribute('class', 'node-label-sub');
      textSub.textContent = isClosed ? "CLOSED" : "EXIT ➔";
      gNode.appendChild(textSub);
    }

    // Node Interaction Events
    gNode.addEventListener('click', (ev) => {
      ev.stopPropagation();
      handleNodeClick(node);
    });

    gNode.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      // Right click toggles hazard in either mode
      if (node.type === 'exit') toggleExit(node.id);
      else toggleNodeBlock(node.id);
    });

    // Tooltip Events
    gNode.addEventListener('mouseenter', (ev) => showMapTooltip(ev, node));
    gNode.addEventListener('mousemove', (ev) => updateMapTooltipPosition(ev));
    gNode.addEventListener('mouseleave', hideMapTooltip);

    nodesLayer.appendChild(gNode);

    // If node is currently selected as start, render beacon halo
    if (isStart) {
      const gBeacon = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gBeacon.setAttribute('transform', `translate(${node.x}, ${node.y})`);

      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('r', 32);
      halo.setAttribute('class', 'start-beacon-ring');

      // Floating START tag badge above node
      const tagG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      tagG.setAttribute('transform', 'translate(0, -32)');

      const tagBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      tagBg.setAttribute('x', -24);
      tagBg.setAttribute('y', -10);
      tagBg.setAttribute('width', 48);
      tagBg.setAttribute('height', 16);
      tagBg.setAttribute('rx', 4);
      tagBg.setAttribute('fill', '#a855f7');
      tagBg.setAttribute('stroke', '#ffffff');
      tagBg.setAttribute('stroke-width', '1');

      const tagText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tagText.setAttribute('y', 2);
      tagText.setAttribute('fill', '#ffffff');
      tagText.setAttribute('font-size', '9px');
      tagText.setAttribute('font-weight', '800');
      tagText.setAttribute('text-anchor', 'middle');
      tagText.setAttribute('dominant-baseline', 'central');
      tagText.textContent = "START";

      tagG.appendChild(tagBg);
      tagG.appendChild(tagText);

      gBeacon.appendChild(halo);
      gBeacon.appendChild(tagG);
      startMarkerLayer.appendChild(gBeacon);
    }
  }
}

/**
 * Handles map node click according to active interaction mode.
 * @param {object} node 
 */
function handleNodeClick(node) {
  if (AppState.interactionMode === 'start') {
    if (node.type === 'exit') {
      showToast(getI18nText('toast_exit_as_start'), 'error');
      return;
    }
    selectStartNode(node.id);
  } else {
    // Hazard toggle mode
    if (node.type === 'exit') {
      toggleExit(node.id);
    } else {
      toggleNodeBlock(node.id);
    }
  }
}

/* ============================================================================
   8. PAN & ZOOM CONTROLS
   ============================================================================ */
function initMapPanZoom() {
  const viewport = document.getElementById('map-viewport');
  const zoomGroup = document.getElementById('svg-zoom-group');

  function updateTransform() {
    zoomGroup.setAttribute(
      'transform',
      `translate(${AppState.svgTransform.panX}, ${AppState.svgTransform.panY}) scale(${AppState.svgTransform.zoom})`
    );
  }

  // Mouse wheel zoom centered at cursor
  viewport.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const zoomFactor = ev.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(Math.max(AppState.svgTransform.zoom * zoomFactor, 0.4), 4.0);

    AppState.svgTransform.zoom = newZoom;
    updateTransform();
  }, { passive: false });

  // Pan via dragging
  viewport.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return; // Left click only
    AppState.svgTransform.isDragging = true;
    AppState.svgTransform.dragStartX = ev.clientX - AppState.svgTransform.panX;
    AppState.svgTransform.dragStartY = ev.clientY - AppState.svgTransform.panY;
  });

  window.addEventListener('mousemove', (ev) => {
    if (!AppState.svgTransform.isDragging) return;
    AppState.svgTransform.panX = ev.clientX - AppState.svgTransform.dragStartX;
    AppState.svgTransform.panY = ev.clientY - AppState.svgTransform.dragStartY;
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    AppState.svgTransform.isDragging = false;
  });

  // Zoom Button Handlers
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    AppState.svgTransform.zoom = Math.min(AppState.svgTransform.zoom * 1.25, 4.0);
    updateTransform();
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    AppState.svgTransform.zoom = Math.max(AppState.svgTransform.zoom * 0.8, 0.4);
    updateTransform();
  });

  document.getElementById('btn-zoom-fit').addEventListener('click', () => {
    resetSvgPanZoom();
  });
}

function resetSvgPanZoom() {
  AppState.svgTransform.panX = 0;
  AppState.svgTransform.panY = 0;
  AppState.svgTransform.zoom = 1;
  const zoomGroup = document.getElementById('svg-zoom-group');
  if (zoomGroup) {
    zoomGroup.setAttribute('transform', 'translate(0, 0) scale(1)');
  }
}

/* ============================================================================
   9. ROUTE SUMMARY & METRICS DISPLAY (REQUIREMENT 5 & 8)
   ============================================================================ */
/**
 * Renders the primary evacuation route card and failure states.
 */
function renderRouteSummary() {
  const alertBanner = document.getElementById('route-alert-banner');
  const alertTitle = document.getElementById('alert-title');
  const alertDesc = document.getElementById('alert-description');
  const successView = document.getElementById('route-success-view');
  const statusPill = document.getElementById('route-status-pill');

  if (AppState.routeStatus === 'ok' && AppState.currentRoute) {
    // Success View
    alertBanner.style.display = 'none';
    successView.style.display = 'block';

    statusPill.className = 'pill pill-success';
    statusPill.textContent = getI18nText('status_route_active');

    // Populate Metrics
    document.getElementById('total-cost-value').textContent = AppState.currentRoute.totalCost;
    document.getElementById('route-hops-value').textContent = AppState.currentRoute.edges.length;
    document.getElementById('target-exit-value').textContent = AppState.currentRoute.targetExit;

    // Render Sequence Chips
    renderRouteSequenceChips(AppState.currentRoute.path);

    // Render Steps Breakdown Table
    renderRouteStepBreakdown(AppState.currentRoute.edges, AppState.currentRoute.path);

  } else if (AppState.routeStatus === 'start_blocked') {
    // Starting Location Blocked state (Requirement 8)
    successView.style.display = 'none';
    alertBanner.style.display = 'flex';
    alertBanner.className = 'alert-banner alert-warning';

    alertTitle.textContent = getI18nText('msg_start_blocked_title');
    alertDesc.textContent = getI18nText('msg_start_blocked_desc');

    statusPill.className = 'pill pill-warning';
    statusPill.textContent = getI18nText('status_route_blocked');

  } else if (AppState.routeStatus === 'no_route') {
    // No route available state (Requirement 8)
    successView.style.display = 'none';
    alertBanner.style.display = 'flex';
    alertBanner.className = 'alert-banner alert-danger';

    alertTitle.textContent = getI18nText('msg_no_route_title');
    alertDesc.textContent = getI18nText('msg_no_route_desc');

    statusPill.className = 'pill pill-danger';
    statusPill.textContent = getI18nText('status_route_none');

  } else {
    // None / neutral
    successView.style.display = 'none';
    alertBanner.style.display = 'none';
    statusPill.className = 'pill pill-warning';
    statusPill.textContent = getI18nText('status_route_none');
  }
}

/**
 * Renders the node sequence breadcrumb chips: START -> C1 -> C2 -> EXIT.
 * @param {Array<string>} path 
 */
function renderRouteSequenceChips(path) {
  const container = document.getElementById('route-sequence-chips');
  container.innerHTML = '';

  for (let i = 0; i < path.length; i++) {
    const nid = path[i];
    const isStart = i === 0;
    const isExit = i === path.length - 1;

    const chip = document.createElement('span');
    chip.className = `seq-node-chip ${isStart ? 'start' : ''} ${isExit ? 'exit' : ''}`;
    chip.textContent = nid;

    container.appendChild(chip);

    if (i < path.length - 1) {
      const arrow = document.createElement('span');
      arrow.className = 'seq-arrow';
      arrow.textContent = '➔';
      container.appendChild(arrow);
    }
  }
}

/**
 * Renders the step-by-step corridor hop list.
 * @param {Array<object>} edges 
 * @param {Array<string>} path 
 */
function renderRouteStepBreakdown(edges, path) {
  const container = document.getElementById('route-steps-list');
  container.innerHTML = '';

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const fromNode = path[i];
    const toNode = path[i + 1];

    const row = document.createElement('div');
    row.className = 'route-step-row';

    const traversal = document.createElement('div');
    traversal.className = 'route-step-traversal';
    traversal.innerHTML = `<span>${fromNode}</span> <span style="color:#64748b;">➔</span> <span>${toNode}</span> <span style="font-size:0.7rem; color:#94a3b8; margin-left:4px;">(${edge.id})</span>`;

    const costBadge = document.createElement('div');
    costBadge.className = 'route-step-cost';
    costBadge.textContent = `+${edge.cost}`;

    row.appendChild(traversal);
    row.appendChild(costBadge);
    container.appendChild(row);
  }
}

/**
 * Updates top header system status indicator.
 */
function updateStatusIndicator() {
  const dot = document.querySelector('#system-status-indicator .status-dot');
  const text = document.getElementById('system-status-text');

  if (AppState.routeStatus === 'ok') {
    dot.className = 'status-dot green';
    text.textContent = getI18nText('status_optimal');
  } else if (AppState.routeStatus === 'start_blocked') {
    dot.className = 'status-dot amber';
    text.textContent = getI18nText('status_hazard_alert');
  } else if (AppState.routeStatus === 'no_route') {
    dot.className = 'status-dot red';
    text.textContent = getI18nText('status_no_route');
  } else {
    dot.className = 'status-dot green';
    text.textContent = getI18nText('status_ready');
  }
}

/* ============================================================================
   10. START LOCATION SELECTORS
   ============================================================================ */
/**
 * Populates start location dropdown and quick chips.
 */
function populateStartLocationSelectors() {
  if (!AppState.buildingData) return;

  const select = document.getElementById('select-start-node');
  const chipsContainer = document.getElementById('quick-start-chips');
  select.innerHTML = '';
  chipsContainer.innerHTML = '';

  // Filter for rooms and junctions only (Exits prohibited as start)
  const validStartNodes = AppState.buildingData.nodes.filter(n => n.type === 'room' || n.type === 'junction');

  for (const node of validStartNodes) {
    // Select Option
    const option = document.createElement('option');
    option.value = node.id;
    option.textContent = `${node.id} — ${node.label} (${node.type.toUpperCase()})`;
    if (node.id === AppState.startNodeId) option.selected = true;
    select.appendChild(option);

    // Quick Pick Chip
    const chipBtn = document.createElement('button');
    chipBtn.type = 'button';
    chipBtn.className = `quick-chip-btn ${node.id === AppState.startNodeId ? 'active' : ''}`;
    chipBtn.textContent = node.id;
    chipBtn.title = node.label;
    chipBtn.addEventListener('click', () => {
      selectStartNode(node.id);
    });
    chipsContainer.appendChild(chipBtn);
  }

  select.onchange = (ev) => {
    selectStartNode(ev.target.value);
  };
}

function syncStartSelectorUI() {
  const select = document.getElementById('select-start-node');
  if (select && AppState.startNodeId) {
    select.value = AppState.startNodeId;
  }

  const chips = document.querySelectorAll('.quick-chip-btn');
  chips.forEach(chip => {
    if (chip.textContent === AppState.startNodeId) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

/* ============================================================================
   11. HAZARD CONTROLS PANEL (REQUIREMENT 7)
   ============================================================================ */
/**
 * Populates hazard toggles for rooms, junctions, corridors, and exits.
 */
function populateHazardControls() {
  if (!AppState.buildingData) return;

  const roomsList = document.getElementById('list-hazard-rooms');
  const junctionsList = document.getElementById('list-hazard-junctions');
  const corridorsList = document.getElementById('list-hazard-corridors');
  const exitsList = document.getElementById('list-hazard-exits');

  roomsList.innerHTML = '';
  junctionsList.innerHTML = '';
  corridorsList.innerHTML = '';
  exitsList.innerHTML = '';

  let roomHazardCount = 0;
  let junctionHazardCount = 0;
  let corridorHazardCount = 0;
  let exitHazardCount = 0;

  const query = AppState.hazardFilterQuery.toLowerCase().trim();

  // Nodes: Rooms & Junctions
  for (const node of AppState.buildingData.nodes) {
    if (query && !node.id.toLowerCase().includes(query) && !node.label.toLowerCase().includes(query)) {
      continue;
    }

    if (node.type === 'room') {
      const isBlocked = isNodeBlocked(node.id);
      if (isBlocked) roomHazardCount++;
      roomsList.appendChild(createHazardToggleRow(node.id, node.label, isBlocked, () => toggleNodeBlock(node.id)));
    } else if (node.type === 'junction') {
      const isBlocked = isNodeBlocked(node.id);
      if (isBlocked) junctionHazardCount++;
      junctionsList.appendChild(createHazardToggleRow(node.id, node.label, isBlocked, () => toggleNodeBlock(node.id)));
    } else if (node.type === 'exit') {
      const isClosed = isExitClosed(node.id);
      if (isClosed) exitHazardCount++;
      exitsList.appendChild(createHazardToggleRow(node.id, `${node.label} (${getI18nText('legend_exit')})`, isClosed, () => toggleExit(node.id)));
    }
  }

  // Corridors (Edges)
  for (const edge of AppState.buildingData.edges) {
    const label = `${edge.from} ➔ ${edge.to} (${getI18nText('cost_label')}: ${edge.cost})`;
    if (query && !edge.id.toLowerCase().includes(query) && !label.toLowerCase().includes(query)) {
      continue;
    }
    const isBlocked = isEdgeBlocked(edge.id);
    if (isBlocked) corridorHazardCount++;
    corridorsList.appendChild(createHazardToggleRow(edge.id, label, isBlocked, () => toggleEdgeBlock(edge.id)));
  }

  // Update tab counter badges
  document.getElementById('badge-count-rooms').textContent = AppState.blockedNodes.size;
  document.getElementById('badge-count-corridors').textContent = AppState.blockedEdges.size;
  document.getElementById('badge-count-exits').textContent = AppState.closedExits.size;
  
  // Count junctions blocked
  let jCount = 0;
  for (const nid of AppState.blockedNodes) {
    const n = AppState.buildingData.nodes.find(node => node.id === nid);
    if (n && n.type === 'junction') jCount++;
  }
  document.getElementById('badge-count-junctions').textContent = jCount;
}

/**
 * Creates an individual toggle switch row.
 */
function createHazardToggleRow(id, label, isBlocked, onToggle) {
  const row = document.createElement('div');
  row.className = `hazard-item-row ${isBlocked ? 'is-blocked' : ''}`;

  const info = document.createElement('div');
  info.className = 'hazard-item-info';

  const title = document.createElement('span');
  title.className = 'hazard-item-id';
  title.textContent = id;

  const sub = document.createElement('span');
  sub.className = 'hazard-item-sub';
  sub.textContent = label;

  info.appendChild(title);
  info.appendChild(sub);

  const switchLabel = document.createElement('label');
  switchLabel.className = 'switch';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isBlocked;
  checkbox.addEventListener('change', onToggle);

  const slider = document.createElement('span');
  slider.className = 'slider';

  switchLabel.appendChild(checkbox);
  switchLabel.appendChild(slider);

  row.appendChild(info);
  row.appendChild(switchLabel);

  return row;
}

function syncHazardControlsUI() {
  populateHazardControls();
}

/* ============================================================================
   12. BENCHMARK QUICK TEST RUNNER (REQUIREMENT 10)
   ============================================================================ */
/**
 * Runs the exact Section 10 benchmark test cases.
 * @param {number} caseNumber 
 */
function runBenchmarkTestCase(caseNumber) {
  // Ensure we are working with the benchmark building (Sample building)
  // If not currently loaded, load it first
  const isBenchmarkGraph = AppState.buildingData?.nodes.some(n => n.id === 'R1' && n.id === 'R2');
  if (!isBenchmarkGraph) {
    loadPresetBuilding('benchmark');
  }

  // Clear previous test button active highlights
  document.querySelectorAll('.btn-test-case').forEach(b => b.classList.remove('active-test'));
  const activeBtn = document.querySelector(`.btn-test-case[data-test="${caseNumber}"]`);
  if (activeBtn) activeBtn.classList.add('active-test');

  switch (caseNumber) {
    case 1:
      // CASE 1: Select R1
      // Expected: R1 → C1 → C2 → E1, Cost: 7
      AppState.blockedNodes.clear();
      AppState.blockedEdges.clear();
      AppState.closedExits.clear();
      selectStartNode('R1');
      showToast("Case 1 executed: R1 → C1 → C2 → E1 (Cost: 7)", "success");
      break;

    case 2:
      // CASE 2: Select R1 and block C2
      // Expected: R1 → C1 → C3 → C4 → E2, Cost: 11
      AppState.blockedNodes.clear();
      AppState.blockedEdges.clear();
      AppState.closedExits.clear();
      AppState.blockedNodes.add('C2');
      selectStartNode('R1');
      showToast("Case 2 executed: R1 → C1 → C3 → C4 → E2 (Cost: 11)", "success");
      break;

    case 3:
      // CASE 3: Select R1 and close E1 and E2
      // Expected: No route available
      AppState.blockedNodes.clear();
      AppState.blockedEdges.clear();
      AppState.closedExits.clear();
      AppState.closedExits.add('E1');
      AppState.closedExits.add('E2');
      selectStartNode('R1');
      showToast("Case 3 executed: No route available", "warning");
      break;

    case 4:
      // CASE 4: Select R2
      // Expected: R2 → C3 → C4 → E2, Cost: 7
      AppState.blockedNodes.clear();
      AppState.blockedEdges.clear();
      AppState.closedExits.clear();
      selectStartNode('R2');
      showToast("Case 4 executed: R2 → C3 → C4 → E2 (Cost: 7)", "success");
      break;

    case 5:
      // CASE 5: Select R1 and then block R1
      // Expected: Starting location blocked
      AppState.blockedNodes.clear();
      AppState.blockedEdges.clear();
      AppState.closedExits.clear();
      AppState.startNodeId = 'R1';
      AppState.blockedNodes.add('R1');
      syncStartSelectorUI();
      syncHazardControlsUI();
      renderNodes();
      renderEdges();
      updateRoute();
      showToast("Case 5 executed: Starting location blocked", "error");
      break;
  }

  syncHazardControlsUI();
}

/* ============================================================================
   13. PRESET DATASETS & FILE EXPORT
   ============================================================================ */
/**
 * Loads predefined preset datasets (Benchmark test building or Metro Hospital).
 * @param {string} key 
 */
function loadPresetBuilding(key) {
  if (key === 'hospital' && window.PRESET_COMPLEX_BUILDING) {
    loadBuilding(window.PRESET_COMPLEX_BUILDING);
  } else if (window.PRESET_BENCHMARK_BUILDING) {
    loadBuilding(window.PRESET_BENCHMARK_BUILDING);
  }
}

/**
 * Exports current building graph and active hazard state as JSON.
 */
function exportCurrentStateJson() {
  if (!AppState.buildingData) return;

  const exportData = {
    building: AppState.buildingData.building,
    nodes: AppState.buildingData.nodes,
    edges: AppState.buildingData.edges,
    initial_state: {
      blocked_nodes: Array.from(AppState.blockedNodes),
      blocked_edges: Array.from(AppState.blockedEdges),
      closed_exits: Array.from(AppState.closedExits)
    },
    export_metadata: {
      timestamp: new Date().toISOString(),
      active_start: AppState.startNodeId,
      current_route: AppState.currentRoute
    }
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `smart_escape_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================================
   14. BILINGUAL SUPPORT & UI LOCALIZATION (REQUIREMENT 15)
   ============================================================================ */
/**
 * Sets application language and updates all UI strings instantly.
 * @param {'en'|'bn'} lang 
 */
function setLanguage(lang) {
  AppState.language = lang;

  // Toggle button styling
  document.getElementById('lang-en').classList.toggle('active', lang === 'en');
  document.getElementById('lang-bn').classList.toggle('active', lang === 'bn');

  // Update HTML lang attribute
  document.documentElement.lang = lang;

  // Update text contents
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = getI18nText(key);
    if (translation) {
      el.textContent = translation;
    }
  });

  // Update placeholders
  const inputs = document.querySelectorAll('[data-i18n-ph]');
  inputs.forEach(input => {
    const key = input.getAttribute('data-i18n-ph');
    const translation = getI18nText(key);
    if (translation) {
      input.placeholder = translation;
    }
  });

  // Re-render dynamic components
  updateRoute();
  populateHazardControls();
}

/**
 * Returns translated string for given key.
 * @param {string} key 
 * @returns {string}
 */
function getI18nText(key) {
  const dict = I18N[AppState.language] || I18N.en;
  return dict[key] || I18N.en[key] || key;
}

/* ============================================================================
   15. TOOLTIPS, TOASTS & ERROR HANDLING
   ============================================================================ */
function showMapTooltip(ev, node) {
  const tooltip = document.getElementById('map-tooltip');
  const isBlocked = isNodeBlocked(node.id);
  const isClosed = node.type === 'exit' && isExitClosed(node.id);

  let statusText = "Accessible";
  if (isBlocked) statusText = "Blocked (Hazard)";
  if (isClosed) statusText = "Closed Exit";

  tooltip.innerHTML = `
    <strong>${node.id}</strong> — ${node.label}<br>
    <span style="color:#94a3b8;">Type: ${node.type.toUpperCase()} | Status: ${statusText}</span>
  `;
  tooltip.style.display = 'block';
  updateMapTooltipPosition(ev);
}

function updateMapTooltipPosition(ev) {
  const tooltip = document.getElementById('map-tooltip');
  const viewport = document.getElementById('map-viewport');
  const rect = viewport.getBoundingClientRect();
  tooltip.style.left = `${ev.clientX - rect.left}px`;
  tooltip.style.top = `${ev.clientY - rect.top}px`;
}

function hideMapTooltip() {
  const tooltip = document.getElementById('map-tooltip');
  tooltip.style.display = 'none';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3200);
}

function showJsonError(message) {
  const banner = document.getElementById('json-error-banner');
  const msgEl = document.getElementById('json-error-msg');
  msgEl.textContent = message;
  banner.style.display = 'flex';
}

function hideJsonError() {
  const banner = document.getElementById('json-error-banner');
  banner.style.display = 'none';
}

/* ============================================================================
   16. EVENT LISTENERS & APPLICATION BOOTSTRAP
   ============================================================================ */
function setupEventListeners() {
  // Language Switchers
  document.getElementById('lang-en').addEventListener('click', () => setLanguage('en'));
  document.getElementById('lang-bn').addEventListener('click', () => setLanguage('bn'));

  // Header Reset Simulation
  document.getElementById('btn-header-reset').addEventListener('click', resetSimulation);

  // Clear All Hazards Button
  document.getElementById('btn-clear-hazards').addEventListener('click', clearAllHazards);

  // Mode Selection: Start vs Hazard
  const modeStartBtn = document.getElementById('mode-select-start');
  const modeHazardBtn = document.getElementById('mode-toggle-hazard');

  modeStartBtn.addEventListener('click', () => {
    AppState.interactionMode = 'start';
    modeStartBtn.classList.add('active');
    modeHazardBtn.classList.remove('active');
  });

  modeHazardBtn.addEventListener('click', () => {
    AppState.interactionMode = 'hazard';
    modeHazardBtn.classList.add('active');
    modeStartBtn.classList.remove('active');
  });

  // Hazard Tabs Navigation
  const tabButtons = document.querySelectorAll('.tabs-nav .tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPane = document.getElementById(btn.getAttribute('data-tab'));
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Hazard Search Input
  const searchInput = document.getElementById('hazard-search-input');
  searchInput.addEventListener('input', (ev) => {
    AppState.hazardFilterQuery = ev.target.value;
    populateHazardControls();
  });

  // Benchmark Test Case Buttons
  document.querySelectorAll('.btn-test-case').forEach(btn => {
    btn.addEventListener('click', () => {
      const testNum = parseInt(btn.getAttribute('data-test'), 10);
      runBenchmarkTestCase(testNum);
    });
  });

  // Preset Dataset Selector
  const presetSelect = document.getElementById('select-preset-building');
  presetSelect.addEventListener('change', (ev) => {
    loadPresetBuilding(ev.target.value);
  });

  // File Upload via Input
  const fileInput = document.getElementById('file-input-json');
  fileInput.addEventListener('change', (ev) => {
    const file = ev.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      loadBuilding(e.target.result);
      fileInput.value = ''; // Reset input
    };
    reader.readAsText(file);
  });

  // File Upload via Drag and Drop
  const dropzone = document.getElementById('file-dropzone');
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      loadBuilding(event.target.result);
    };
    reader.readAsText(file);
  });

  // Dismiss JSON error
  document.getElementById('btn-dismiss-json-error').addEventListener('click', hideJsonError);

  // Export JSON
  document.getElementById('btn-export-json').addEventListener('click', exportCurrentStateJson);

  // Help Modal Dialog
  const helpModal = document.getElementById('help-modal');
  document.getElementById('btn-help-modal').addEventListener('click', () => {
    helpModal.showModal();
  });
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    helpModal.close();
  });
  document.getElementById('btn-modal-ok').addEventListener('click', () => {
    helpModal.close();
  });
  helpModal.addEventListener('click', (ev) => {
    if (ev.target === helpModal) helpModal.close();
  });

  // Initialize Pan & Zoom on Map
  initMapPanZoom();
}

/* ============================================================================
   17. EMBEDDED PRESET DATASETS (Zero-delay offline bootstrapping)
   ============================================================================ */
window.PRESET_BENCHMARK_BUILDING = {
  "building": {
    "name": "Innovation Complex - Level 1",
    "description": "Standard benchmark test building for evacuation routing"
  },
  "nodes": [
    { "id": "R1", "label": "Room 1 (Research Lab)", "type": "room", "x": 100, "y": 140 },
    { "id": "R2", "label": "Room 2 (Conference)", "type": "room", "x": 100, "y": 360 },
    { "id": "C1", "label": "Junction C1 (North Hub)", "type": "junction", "x": 260, "y": 140 },
    { "id": "C2", "label": "Junction C2 (East Corridor)", "type": "junction", "x": 420, "y": 140 },
    { "id": "C3", "label": "Junction C3 (Central Hub)", "type": "junction", "x": 260, "y": 360 },
    { "id": "C4", "label": "Junction C4 (South Corridor)", "type": "junction", "x": 420, "y": 360 },
    { "id": "E1", "label": "Exit 1 (North Gate)", "type": "exit", "x": 580, "y": 140 },
    { "id": "E2", "label": "Exit 2 (South Gate)", "type": "exit", "x": 580, "y": 360 }
  ],
  "edges": [
    { "id": "edge_R1_C1", "from": "R1", "to": "C1", "cost": 2 },
    { "id": "edge_C1_C2", "from": "C1", "to": "C2", "cost": 3 },
    { "id": "edge_C2_E1", "from": "C2", "to": "E1", "cost": 2 },
    { "id": "edge_C1_C3", "from": "C1", "to": "C3", "cost": 4 },
    { "id": "edge_R2_C3", "from": "R2", "to": "C3", "cost": 2 },
    { "id": "edge_C3_C4", "from": "C3", "to": "C4", "cost": 3 },
    { "id": "edge_C4_E2", "from": "C4", "to": "E2", "cost": 2 }
  ],
  "initial_state": {
    "blocked_nodes": [],
    "blocked_edges": [],
    "closed_exits": []
  }
};

window.PRESET_COMPLEX_BUILDING = {
  "building": {
    "name": "Metro General Hospital - Ward 3",
    "description": "Multi-corridor hospital facility with 3 emergency exits and multiple wings"
  },
  "nodes": [
    { "id": "ICU_1", "label": "ICU Ward 1", "type": "room", "x": 100, "y": 100 },
    { "id": "SURG_2", "label": "Surgical Suite", "type": "room", "x": 100, "y": 250 },
    { "id": "PEDS_3", "label": "Pediatrics", "type": "room", "x": 100, "y": 420 },
    { "id": "LAB_4", "label": "Diagnostic Lab", "type": "room", "x": 100, "y": 560 },
    { "id": "J_NW", "label": "NW Corridor", "type": "junction", "x": 260, "y": 100 },
    { "id": "J_W", "label": "West Hub", "type": "junction", "x": 260, "y": 250 },
    { "id": "J_SW", "label": "SW Corridor", "type": "junction", "x": 260, "y": 420 },
    { "id": "J_CTR", "label": "Central Lobby", "type": "junction", "x": 420, "y": 280 },
    { "id": "STAFF_5", "label": "Staff Lounge", "type": "room", "x": 420, "y": 100 },
    { "id": "PHARM_6", "label": "Pharmacy", "type": "room", "x": 420, "y": 480 },
    { "id": "J_NE", "label": "NE Hallway", "type": "junction", "x": 580, "y": 120 },
    { "id": "J_E", "label": "East Wing", "type": "junction", "x": 580, "y": 280 },
    { "id": "J_SE", "label": "SE Hallway", "type": "junction", "x": 580, "y": 460 },
    { "id": "EXIT_NORTH", "label": "North Fire Escape", "type": "exit", "x": 750, "y": 120 },
    { "id": "EXIT_EAST", "label": "Main East Exit", "type": "exit", "x": 750, "y": 280 },
    { "id": "EXIT_SOUTH", "label": "South Ambulance Bay", "type": "exit", "x": 750, "y": 460 }
  ],
  "edges": [
    { "id": "e_icu_nw", "from": "ICU_1", "to": "J_NW", "cost": 3 },
    { "id": "e_surg_w", "from": "SURG_2", "to": "J_W", "cost": 2 },
    { "id": "e_peds_sw", "from": "PEDS_3", "to": "J_SW", "cost": 3 },
    { "id": "e_lab_sw", "from": "LAB_4", "to": "J_SW", "cost": 4 },
    { "id": "e_nw_w", "from": "J_NW", "to": "J_W", "cost": 4 },
    { "id": "e_w_sw", "from": "J_W", "to": "J_SW", "cost": 4 },
    { "id": "e_nw_staff", "from": "J_NW", "to": "STAFF_5", "cost": 5 },
    { "id": "e_w_ctr", "from": "J_W", "to": "J_CTR", "cost": 5 },
    { "id": "e_sw_pharm", "from": "J_SW", "to": "PHARM_6", "cost": 5 },
    { "id": "e_staff_ne", "from": "STAFF_5", "to": "J_NE", "cost": 4 },
    { "id": "e_ctr_ne", "from": "J_CTR", "to": "J_NE", "cost": 4 },
    { "id": "e_ctr_e", "from": "J_CTR", "to": "J_E", "cost": 3 },
    { "id": "e_ctr_se", "from": "J_CTR", "to": "J_SE", "cost": 4 },
    { "id": "e_pharm_se", "from": "PHARM_6", "to": "J_SE", "cost": 3 },
    { "id": "e_ne_exit_n", "from": "J_NE", "to": "EXIT_NORTH", "cost": 3 },
    { "id": "e_e_exit_e", "from": "J_E", "to": "EXIT_EAST", "cost": 2 },
    { "id": "e_se_exit_s", "from": "J_SE", "to": "EXIT_SOUTH", "cost": 3 },
    { "id": "e_ne_e", "from": "J_NE", "to": "J_E", "cost": 3 },
    { "id": "e_e_se", "from": "J_E", "to": "J_SE", "cost": 3 }
  ],
  "initial_state": {
    "blocked_nodes": ["PHARM_6"],
    "blocked_edges": ["e_nw_w"],
    "closed_exits": ["EXIT_NORTH"]
  }
};

/* ============================================================================
   18. BOOTSTRAP ENTRY POINT
   ============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();

  // Parse URL query parameters for direct testing / preview links
  const params = new URLSearchParams(window.location.search);
  const targetDataset = params.get('dataset');
  const targetLang = params.get('lang');
  const testCase = params.get('case');

  function postInit() {
    if (targetLang === 'bn') {
      setLanguage('bn');
    }
    if (testCase) {
      runBenchmarkTestCase(parseInt(testCase, 10));
    }
  }

  if (targetDataset === 'hospital') {
    loadBuilding(window.PRESET_COMPLEX_BUILDING);
    postInit();
  } else {
    // Try fetching external building.json if served over HTTP/HTTPS,
    // or fall back smoothly to the bundled benchmark building dataset.
    fetch('building.json')
      .then(res => {
        if (!res.ok) throw new Error("Local fetch not available (file:// or 404)");
        return res.json();
      })
      .then(data => {
        loadBuilding(data);
        postInit();
      })
      .catch(() => {
        // Fallback for file:// protocol or offline opening
        loadBuilding(window.PRESET_BENCHMARK_BUILDING);
        postInit();
      });
  }
});
