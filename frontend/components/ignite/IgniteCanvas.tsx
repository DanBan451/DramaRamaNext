"use client";

// IgniteCanvas — Ignite application workspace (terrain + Fire Starter rendering).
// Forked from Forge Canvas; Forge Canvas is not modified.
//
// Phase 4b discipline:
//   - The parent owns data (thoughts[] + connections[]) and the network
//     layer. Canvas calls handler props (`onCreateThought`, `onDeleteThought`,
//     `onUpdateThoughtPosition`, `onCreateConnection`, ...) for every mutation
//     and AWAITS them so it can use the real server-assigned id in follow-up
//     calls (e.g. create-thought-then-connect).
//   - The "Get Nudge" buttons are rendered but disabled (Coming soon — phase 4c).
//   - The proposed-flow / organize-preview / focused-thought / branch-from /
//     bulk-delete-callback / clear-element callbacks are NOT ported. They will
//     come back in later sub-phases.
//
// Things kept verbatim from Weaponry:
//   - Pan / zoom (Cmd/Ctrl + drag, Cmd/Ctrl + scroll)
//   - Drag-with-localPositions optimistic cache
//   - Edge auto-scroll while dragging
//   - SVG bezier connection rendering
//   - Trace-to-origin highlight
//   - Bulk-select mode
//   - Connector-dot click-then-click connection gesture
//   - pendingConnectionFrom (click connector, then click empty canvas, type,
//     enter — creates a thought AND a connection in one shot)
//   - Delete / Backspace / Escape keyboard shortcuts

import { useState, useRef, useCallback, useEffect } from "react";
import {
  getElement,
  getSubElement,
  getElementColor,
} from "@/lib/elements";
import ElementIdentityStrip from "@/components/elements/ElementIdentityStrip";
import ElementTaggedThoughtBody from "@/components/elements/ElementTaggedThoughtBody";
import ElementThumbnail from "@/components/elements/ElementThumbnail";
import type { Thought, Connection } from "@/types/canvas";

const CANVAS_INITIAL = 32000;
const CANVAS_PADDING = 2000;
const BLOCK_WIDTH = 280;
const BLOCK_WIDTH_FIRE_STARTER = 340;
const BLOCK_MIN_HEIGHT = 100;
const BLOCK_MIN_HEIGHT_FIRE_STARTER = 120;

import { FIRE_STARTER_STYLE, TERRAIN_TYPE_STYLES } from "@/lib/canvas-palette";

const SCROLL_EDGE_THRESHOLD = 60;
const SCROLL_SPEED = 18;

interface CanvasProps {
  coursePuzzleId: string;
  thoughts: Thought[];
  connections: Connection[];
  selectedElement: string | null;
  selectedSubElement: string | null;
  focusThoughtIds?: string[] | null;

  onCreateThought: ((body: {
    content: string;
    element: string | null;
    sub_element: string | null;
    pos_x: number;
    pos_y: number;
    time_spent_seconds: number | null;
  }) => Promise<Thought>) | null;
  onUpdateThoughtPosition: ((
    thoughtId: string,
    pos_x: number,
    pos_y: number,
  ) => Promise<void>) | null;
  onUpdateThoughtContent: ((thoughtId: string, content: string) => Promise<void>) | null;
  onUpdateThoughtTagging: ((
    thoughtId: string,
    element: string | null,
    sub_element: string | null,
  ) => Promise<void>) | null;
  onDeleteThought: ((thoughtId: string) => Promise<void>) | null;

  onCreateConnection: ((
    from_thought_id: string,
    to_thought_id: string,
  ) => Promise<Connection>) | null;
  onDeleteConnection: ((connectionId: string) => Promise<void>) | null;

  onClearElement?: () => void;
  /** When true, canvas is view-only: pan/zoom and trace only. */
  viewOnly?: boolean;
}

interface DraftBlock {
  x: number;
  y: number;
}

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export default function IgniteCanvas({
  coursePuzzleId: _coursePuzzleId,
  thoughts,
  connections,
  selectedElement,
  selectedSubElement,
  focusThoughtIds = null,
  onCreateThought,
  onUpdateThoughtPosition,
  onUpdateThoughtContent: _onUpdateThoughtContent,
  onUpdateThoughtTagging,
  onDeleteThought,
  onCreateConnection,
  onDeleteConnection,
  onClearElement,
  viewOnly = false,
}: CanvasProps) {
  void _coursePuzzleId;
  void _onUpdateThoughtContent;
  const canMutate = !viewOnly;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DraftBlock | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [selectedThought, setSelectedThought] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  // Bulk selection state
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  // Trace path to origin
  const [tracedPath, setTracedPath] = useState<Set<string>>(new Set());
  const [tracedConnections, setTracedConnections] = useState<Set<string>>(new Set());

  // Hovered connection line (for the click-to-delete interaction on SVG paths)
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  // Pending connection: when user clicks connector then clicks empty canvas
  const [pendingConnectionFrom, setPendingConnectionFrom] = useState<string | null>(null);
  // Keeps the dashed line visible after the draft is saved but before the
  // real connection round-trip finishes — prevents the flicker where the
  // line disappears and then reappears as a solid arrow.
  const [inflightConnectionFrom, setInflightConnectionFrom] = useState<string | null>(null);
  const [inflightConnectionToPos, setInflightConnectionToPos] = useState<{ x: number; y: number } | null>(null);
  const draftTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Zoom state
  const [zoom, setZoom] = useState(1);

  // Dragging blocks
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const dragScrollRef = useRef<number | null>(null);

  // Draft dragging
  const [draggingDraft, setDraggingDraft] = useState(false);
  const [draftDragOffset, setDraftDragOffset] = useState({ x: 0, y: 0 });

  // Canvas panning (click+drag on empty space)
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // When the parent requests focus (e.g. Stage 2 nudges were seeded),
  // pan the viewport to the centroid of those thoughts so the user can
  // immediately find them.
  const lastFocusKeyRef = useRef<string>("");
  useEffect(() => {
    if (!containerRef.current) return;
    if (!focusThoughtIds || focusThoughtIds.length === 0) return;

    const key = focusThoughtIds.join(",");
    if (key === lastFocusKeyRef.current) return;
    lastFocusKeyRef.current = key;

    const targets = focusThoughtIds
      .map((id) => thoughts.find((t) => t.id === id))
      .filter(Boolean);
    if (targets.length === 0) return;

    let sumX = 0;
    let sumY = 0;
    for (const t of targets) {
      sumX += t.pos_x + BLOCK_WIDTH / 2;
      sumY += t.pos_y + BLOCK_MIN_HEIGHT / 2;
    }
    const cx = sumX / targets.length;
    const cy = sumY / targets.length;

    // If zoom is very far out, bring it back to a usable level so the
    // newly added blocks are actually visible.
    const targetZoom = zoom < 0.7 ? 1 : undefined;
    scrollToPosition(cx, cy, targetZoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusThoughtIds, thoughts]);

  // Center viewport on mount (Weaponry parity: always open on canvas center).
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollLeft =
      CANVAS_INITIAL / 2 - containerRef.current.clientWidth / 2;
    containerRef.current.scrollTop =
      CANVAS_INITIAL / 2 - containerRef.current.clientHeight / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retag the selected thought when the user picks an element from the sidebar.
  // Track the previous sub-element so we only fire on intentional changes, not on mount.
  const prevSubElementRef = useRef(selectedSubElement);
  useEffect(() => {
    const prev = prevSubElementRef.current;
    prevSubElementRef.current = selectedSubElement;
    // Only act when the user just selected a sub-element (not on deselect, not on mount with same value)
    if (!selectedThought || !selectedElement || !selectedSubElement) return;
    if (selectedSubElement === prev) return;
    onUpdateThoughtTagging?.(selectedThought, selectedElement, selectedSubElement).catch(() => {});
  }, [selectedElement, selectedSubElement]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus draft textarea without scrolling
  useEffect(() => {
    if (draft && draftTextareaRef.current) {
      draftTextareaRef.current.focus({ preventScroll: true });
    }
  }, [draft]);

  // Zoom with Ctrl/Cmd + scroll wheel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function handleWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = 1 - e.deltaY * 0.002;
        setZoom((prev) => Math.min(2, Math.max(0.25, prev * factor)));
      }
    }
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Keyboard: Delete/Backspace to remove draft or selected thought
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "TEXTAREA" || tag === "INPUT") return;
        if (draft) {
          e.preventDefault();
          handleCancelDraft();
          return;
        }
        if (selectedThought) {
          e.preventDefault();
          deleteThought(selectedThought);
          return;
        }
      }
      if (e.key === "Escape") {
        if (draft) handleCancelDraft();
        if (connectingFrom) setConnectingFrom(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Cleanup auto-scroll RAF when drag ends
  useEffect(() => {
    if (!dragging) {
      if (dragScrollRef.current) {
        cancelAnimationFrame(dragScrollRef.current);
        dragScrollRef.current = null;
      }
      return;
    }
    return () => {
      if (dragScrollRef.current) {
        cancelAnimationFrame(dragScrollRef.current);
        dragScrollRef.current = null;
      }
    };
  }, [dragging]);

  const lastMousePos = useRef({ x: 0, y: 0 });

  function getThoughtPos(t: Thought) {
    if (localPositions[t.id]) return localPositions[t.id];
    return { x: t.pos_x, y: t.pos_y };
  }

  function scrollToPosition(x: number, y: number, targetZoom?: number) {
    const container = containerRef.current;
    if (!container) return;
    const z = targetZoom ?? zoom;
    container.scrollLeft = x * z - container.clientWidth / 2;
    container.scrollTop = y * z - container.clientHeight / 2;
    if (targetZoom !== undefined) setZoom(targetZoom);
  }

  function handleCanvasClick(e: React.MouseEvent) {
    if (e.detail > 1) return;
    // Read-only mode: no creating via click
    if (!onCreateThought) return;

    if (connectingFrom) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom - BLOCK_WIDTH / 2;
      const y = (e.clientY - rect.top) / zoom - BLOCK_MIN_HEIGHT / 2;

      if (draft && draftContent.trim()) handleSaveDraft();

      setPendingConnectionFrom(connectingFrom);
      setConnectingFrom(null);
      // Connected drafts are always plain (untagged)
      onClearElement?.();
      setDraft({ x, y });
      setDraftContent("");
      setSelectedThought(null);
      return;
    }

    // Allow placing plain (untagged) thoughts even without element selected
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom - BLOCK_WIDTH / 2;
    const y = (e.clientY - rect.top) / zoom - BLOCK_MIN_HEIGHT / 2;

    if (draft && draftContent.trim()) handleSaveDraft();

    setDraft({ x, y });
    setDraftContent("");
    setSelectedThought(null);

    if (zoom < 0.7) {
      setTimeout(() => scrollToPosition(x + BLOCK_WIDTH / 2, y + BLOCK_MIN_HEIGHT / 2, 1), 50);
    }
  }

  function handleCanvasDoubleClick(e: React.MouseEvent) {
    // Read-only mode: no new thoughts allowed
    if (!onCreateThought) return;

    if (draft && draftContent.trim()) {
      handleSaveDraft();
    } else if (draft) {
      handleCancelDraft();
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom - BLOCK_WIDTH / 2;
    const y = (e.clientY - rect.top) / zoom - BLOCK_MIN_HEIGHT / 2;

    setDraft({ x, y });
    setDraftContent("");
    setSelectedThought(null);
  }

  function handleDraftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraftContent(e.target.value);
  }

  async function handleSaveDraft() {
    if (!draft || !draftContent.trim()) return;

    const body = {
      content: draftContent.trim(),
      element: selectedElement || null,
      sub_element: selectedSubElement || null,
      pos_x: draft.x,
      pos_y: draft.y,
      time_spent_seconds: null,
    };

    // Snapshot-and-clear the draft UI immediately so the user can keep working.
    // Pending-connection source is captured too, since we need its id AFTER
    // the create-thought call resolves (which may take a few hundred ms).
    const pendingFrom = pendingConnectionFrom;
    const draftPos = { x: draft.x, y: draft.y };
    setPendingConnectionFrom(null);
    setDraft(null);
    setDraftContent("");

    // Keep a ghost dashed line from the source to where the draft was so
    // there's no flicker gap while the create-thought + create-connection
    // round-trips are in-flight.
    if (pendingFrom) {
      setInflightConnectionFrom(pendingFrom);
      setInflightConnectionToPos(draftPos);
    }

    try {
      if (!onCreateThought) return;
      const newThought = await onCreateThought(body);
      if (pendingFrom) {
        // Await the connection so the real arrow appears before we drop the ghost.
        await onCreateConnection?.(pendingFrom, newThought.id).catch(() => {
          /* parent shows error toast */
        });
      }
    } catch {
      // Parent already rolled back optimistic state + surfaced an error.
    } finally {
      setInflightConnectionFrom(null);
      setInflightConnectionToPos(null);
    }
  }

  function handleCancelDraft() {
    setDraft(null);
    setDraftContent("");
    setPendingConnectionFrom(null);
  }

  function handleBlockClick(e: React.MouseEvent, thoughtId: string) {
    e.stopPropagation();
    if (bulkSelectMode) {
      setBulkSelected((prev) => {
        const next = new Set(prev);
        if (next.has(thoughtId)) next.delete(thoughtId);
        else next.add(thoughtId);
        return next;
      });
      return;
    }
    if (connectingFrom) {
      if (connectingFrom !== thoughtId) {
        createConnectionLocal(connectingFrom, thoughtId);
      }
      setConnectingFrom(null);
    } else {
      setSelectedThought(selectedThought === thoughtId ? null : thoughtId);
    }
  }

  function startConnection(e: React.MouseEvent, thoughtId: string) {
    if (viewOnly) return;
    e.stopPropagation();
    // If a connection is already in flight (user clicked another connector
    // first), treat THIS click as the destination — connector→connector
    // should complete the connection, not silently re-anchor it. Direction
    // is always source→destination based on click order.
    if (connectingFrom && connectingFrom !== thoughtId) {
      createConnectionLocal(connectingFrom, thoughtId);
      setConnectingFrom(null);
      return;
    }
    // Click the same connector twice to cancel the in-flight connection.
    if (connectingFrom === thoughtId) {
      setConnectingFrom(null);
      return;
    }
    setConnectingFrom(thoughtId);
    setSelectedThought(null);
  }

  // Create-connection path used by the connector-dot gesture and the
  // pending-connection flow. Duplicate suppression is a UX nicety; the
  // backend is also idempotent on (course_puzzle_id, from, to).
  function createConnectionLocal(fromId: string, toId: string) {
    if (fromId === toId) return;
    if (
      connections.some(
        (c) => c.from_thought_id === fromId && c.to_thought_id === toId,
      )
    ) {
      return;
    }
    onCreateConnection?.(fromId, toId).catch(() => {
      /* parent handles rollback + toast */
    });
  }

  function deleteThought(thoughtId: string) {
    if (!onDeleteThought) return;
    // Parent optimistically removes thought + its edges; backend CASCADEs.
    onDeleteThought(thoughtId).catch(() => {
      /* parent rolls back */
    });
    setSelectedThought(null);
    setLocalPositions((prev) => {
      const next = { ...prev };
      delete next[thoughtId];
      return next;
    });
  }

  function deleteConnectionLocal(connId: string) {
    onDeleteConnection?.(connId).catch(() => {
      /* parent rolls back */
    });
  }

  function bulkDeleteSelected() {
    if (bulkSelected.size === 0) return;
    const ids = Array.from(bulkSelected);
    // Fire a delete per thought. The backend cascades edges automatically.
    // Phase 4b accepts N serial-ish requests; bulk endpoint can come later.
    for (const id of ids) {
      onDeleteThought?.(id).catch(() => {
        /* parent rolls back each failure individually */
      });
    }
    setBulkSelected(new Set());
    setBulkSelectMode(false);
    setSelectedThought(null);
    setLocalPositions((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });
  }

  function tracePathToOrigin(thoughtId: string) {
    const visited = new Set<string>();
    const visitedConns = new Set<string>();
    const parentMap = new Map<string, { parentId: string; connId: string }>();

    for (const c of connections) {
      if (!parentMap.has(c.to_thought_id)) {
        parentMap.set(c.to_thought_id, { parentId: c.from_thought_id, connId: c.id });
      }
    }

    let current: string | undefined = thoughtId;
    while (current) {
      if (visited.has(current)) break;
      visited.add(current);
      const parent = parentMap.get(current);
      if (parent) {
        visitedConns.add(parent.connId);
        current = parent.parentId;
      } else {
        break;
      }
    }

    if (tracedPath.size > 0 && tracedPath.has(thoughtId)) {
      setTracedPath(new Set());
      setTracedConnections(new Set());
    } else {
      setTracedPath(visited);
      setTracedConnections(visitedConns);
    }
  }

  // Block drag handlers
  function handleBlockMouseDown(e: React.MouseEvent, thoughtId: string) {
    if (viewOnly) return;
    if ((e.target as HTMLElement).closest("[data-connector]")) return;
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const t = thoughts.find((x) => x.id === thoughtId);
    if (!t) return;
    const pos = getThoughtPos(t);
    setDragging(thoughtId);
    setDragOffset({
      x: (e.clientX - rect.left) / zoom - pos.x,
      y: (e.clientY - rect.top) / zoom - pos.y,
    });
  }

  function handleDraftMouseDown(e: React.MouseEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "TEXTAREA" || tag === "BUTTON") return;
    e.stopPropagation();
    if (!draft) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setDraggingDraft(true);
    setDraftDragOffset({
      x: (e.clientX - rect.left) / zoom - draft.x,
      y: (e.clientY - rect.top) / zoom - draft.y,
    });
  }

  function handleContainerMouseDown(e: React.MouseEvent) {
    if (dragging || draggingDraft) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("[data-block]") ||
      target.closest("[data-draft]") ||
      target.tagName === "BUTTON"
    )
      return;
    if (selectedElement && selectedSubElement) return;
    if (connectingFrom) return;

    setPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (panning) {
      const container = containerRef.current;
      if (!container) return;
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      container.scrollLeft -= dx;
      container.scrollTop -= dy;
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (draggingDraft && draft) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const newX = (e.clientX - rect.left) / zoom - draftDragOffset.x;
      const newY = (e.clientY - rect.top) / zoom - draftDragOffset.y;
      setDraft({ x: newX, y: newY });
      return;
    }

    if (!dragging) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = canvas.getBoundingClientRect();
    const newX = (e.clientX - rect.left) / zoom - dragOffset.x;
    const newY = (e.clientY - rect.top) / zoom - dragOffset.y;
    setLocalPositions((prev) => ({ ...prev, [dragging]: { x: newX, y: newY } }));

    lastMousePos.current = { x: e.clientX, y: e.clientY };

    const containerRect = container.getBoundingClientRect();
    const relX = e.clientX - containerRect.left;
    const relY = e.clientY - containerRect.top;
    const needsScroll =
      relX < SCROLL_EDGE_THRESHOLD ||
      relX > containerRect.width - SCROLL_EDGE_THRESHOLD ||
      relY < SCROLL_EDGE_THRESHOLD ||
      relY > containerRect.height - SCROLL_EDGE_THRESHOLD;

    if (needsScroll && !dragScrollRef.current) {
      const scrollLoop = () => {
        if (!containerRef.current || !dragging) return;
        const cr = containerRef.current.getBoundingClientRect();
        const mx = lastMousePos.current.x - cr.left;
        const my = lastMousePos.current.y - cr.top;
        let dx = 0,
          dy = 0;
        if (mx < SCROLL_EDGE_THRESHOLD) dx = -SCROLL_SPEED;
        else if (mx > cr.width - SCROLL_EDGE_THRESHOLD) dx = SCROLL_SPEED;
        if (my < SCROLL_EDGE_THRESHOLD) dy = -SCROLL_SPEED;
        else if (my > cr.height - SCROLL_EDGE_THRESHOLD) dy = SCROLL_SPEED;
        if (dx !== 0 || dy !== 0) {
          containerRef.current.scrollLeft += dx;
          containerRef.current.scrollTop += dy;
        }
        dragScrollRef.current = requestAnimationFrame(scrollLoop);
      };
      dragScrollRef.current = requestAnimationFrame(scrollLoop);
    } else if (!needsScroll && dragScrollRef.current) {
      cancelAnimationFrame(dragScrollRef.current);
      dragScrollRef.current = null;
    }
  }

  function handleCanvasMouseUp() {
    if (panning) {
      setPanning(false);
      return;
    }
    if (draggingDraft) {
      setDraggingDraft(false);
      return;
    }
    if (!dragging) return;
    const pos = localPositions[dragging];
    const draggedId = dragging;
    if (pos) {
      // Fire the position PATCH. Parent does optimistic update + rollback.
      // We keep the localPositions entry so the rendered position stays
      // smooth across the round-trip — parent will reconcile via its state.
      onUpdateThoughtPosition?.(draggedId, pos.x, pos.y).catch(() => {
        /* parent rolls back; we clear our local override so we re-read props */
        setLocalPositions((prev) => {
          const next = { ...prev };
          delete next[draggedId];
          return next;
        });
      });
    }
    setDragging(null);
  }

  // Connection line anchor: the connector dot is at bottom-right of the block
  function getConnectorPos(t: Thought) {
    const pos = getThoughtPos(t);
    const w = t.is_fire_starter_node ? BLOCK_WIDTH_FIRE_STARTER : BLOCK_WIDTH;
    const h = t.is_fire_starter_node ? BLOCK_MIN_HEIGHT_FIRE_STARTER : BLOCK_MIN_HEIGHT;
    return { x: pos.x + w - 16, y: pos.y + h - 10 };
  }

  // The arrow head should land on the LEFT edge of the target block, vertically
  // centered. We pull the tip in by ARROW_TIP_INSET so the marker (which has a
  // refX of 10) doesn't overshoot into the block fill.
  const ARROW_TIP_INSET = 4;
  function getBlockLeftAnchor(t: Thought) {
    const pos = getThoughtPos(t);
    return {
      x: pos.x - ARROW_TIP_INSET,
      y: pos.y + BLOCK_MIN_HEIGHT / 2,
    };
  }

  const thoughtMap = new Map(thoughts.map((t) => [t.id, t]));

  // Dynamic canvas size — grows as thoughts are placed further out
  let canvasW = CANVAS_INITIAL;
  let canvasH = CANVAS_INITIAL;
  for (const t of thoughts) {
    const pos = getThoughtPos(t);
    canvasW = Math.max(canvasW, pos.x + BLOCK_WIDTH + CANVAS_PADDING);
    canvasH = Math.max(canvasH, pos.y + BLOCK_MIN_HEIGHT + CANVAS_PADDING);
  }
  if (draft) {
    canvasW = Math.max(canvasW, draft.x + BLOCK_WIDTH + CANVAS_PADDING);
    canvasH = Math.max(canvasH, draft.y + BLOCK_MIN_HEIGHT + CANVAS_PADDING);
  }

  return (
    <div className="canvas-host absolute inset-0 overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {connectingFrom && (
          <div className="rounded-lg border border-mist bg-white px-3 py-1.5 text-xs text-[#2A2A2A]">
            Click a block to connect — or{" "}
            <button onClick={() => setConnectingFrom(null)} className="underline">
              cancel
            </button>
          </div>
        )}
        {tracedPath.size > 0 && (
          <button
            onClick={() => {
              setTracedPath(new Set());
              setTracedConnections(new Set());
            }}
            className="rounded-lg border border-mist bg-white px-3 py-1.5 text-xs text-smoke transition-colors hover:bg-[#F5F5F5]"
          >
            Clear trace
          </button>
        )}
        {bulkSelectMode ? (
          <div className="flex items-center gap-1.5">
            <span className="rounded-lg border border-mist bg-[#FAFAFA] px-3 py-1.5 text-xs text-smoke">
              {bulkSelected.size} selected
            </span>
            <button
              onClick={bulkDeleteSelected}
              disabled={bulkSelected.size === 0}
              className="rounded-lg border border-mist bg-white px-3 py-1.5 text-xs font-medium text-smoke transition-colors hover:bg-[#F5F5F5] disabled:opacity-40"
            >
              Delete Selected
            </button>
            <button
              onClick={() => {
                setBulkSelected(new Set(thoughts.map((t) => t.id)));
              }}
              className="px-3 py-1.5 border border-[var(--wireframe)] bg-white rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              All
            </button>
            <button
              onClick={() => {
                setBulkSelectMode(false);
                setBulkSelected(new Set());
              }}
              className="px-3 py-1.5 border border-[var(--wireframe)] bg-white rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : !viewOnly ? (
          <button
            onClick={() => {
              setBulkSelectMode(true);
              setBulkSelected(new Set());
              setSelectedThought(null);
            }}
            className="px-3 py-1.5 border border-[var(--wireframe)] bg-white rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
            title="Enter multi-select mode to delete multiple thoughts"
          >
            Multi-Select
          </button>
        ) : null}
        <div className="px-3 py-1.5 bg-white border border-[var(--wireframe)] rounded-lg text-xs text-[var(--text-muted)]">
          {viewOnly
            ? "View only — review your canvas while you reflect"
            : selectedSubElement
              ? "Click canvas to place tagged thought"
              : "Click canvas to place a thought"}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1">
        <div className="flex items-center bg-white border border-[var(--wireframe)] rounded-lg shadow-sm">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z * 0.85))}
            className="px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] rounded-l-lg transition-colors"
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-2 py-1.5 text-xs font-mono text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-colors min-w-[3rem] text-center"
            title="Reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2, z * 1.15))}
            className="px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] rounded-r-lg transition-colors"
            title="Zoom in"
          >
            +
          </button>
        </div>
        <button
          onClick={() => {
            setZoom(1);
            if (containerRef.current) {
              if (thoughts.length > 0) {
                let sumX = 0,
                  sumY = 0;
                thoughts.forEach((t) => {
                  const p = getThoughtPos(t);
                  sumX += p.x + BLOCK_WIDTH / 2;
                  sumY += p.y + BLOCK_MIN_HEIGHT / 2;
                });
                scrollToPosition(sumX / thoughts.length, sumY / thoughts.length, 1);
              } else {
                containerRef.current.scrollLeft = canvasW / 2 - containerRef.current.clientWidth / 2;
                containerRef.current.scrollTop = canvasH / 2 - containerRef.current.clientHeight / 2;
              }
            }
          }}
          className="px-2 py-1.5 bg-white border border-[var(--wireframe)] rounded-lg shadow-sm text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
          title="Re-center view"
        >
          ⌖
        </button>
      </div>

      {/* Selected thought detail panel */}
      {selectedThought &&
        (() => {
          const thought = thoughts.find((t) => t.id === selectedThought);
          if (!thought) return null;
          const el = thought.element ? getElement(thought.element) : null;
          const subEl =
            thought.element && thought.sub_element
              ? getSubElement(thought.element, thought.sub_element)
              : null;
          const detailElColor = thought.element ? getElementColor(thought.element) : null;
          const thoughtConnections = connections.filter(
            (c) => c.from_thought_id === thought.id || c.to_thought_id === thought.id,
          );
          return (
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-[var(--wireframe)] shadow-[0_-4px_16px_var(--shadow)]">
              <div className="px-6 py-4 max-w-3xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {subEl && detailElColor ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-mist text-sm font-bold text-smoke">
                        {subEl.symbol}
                      </span>
                    ) : el ? (
                      <ElementThumbnail elementId={thought.element} size="node" />
                    ) : null}
                    {subEl && (
                      <span className="text-xs font-medium text-smoke">{subEl.name}</span>
                    )}
                    {!el && (
                      <span className="text-xs text-[var(--text-muted)] italic">
                        untagged
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatRelativeTime(thought.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {el && subEl && (
                      <button
                        disabled
                        title="Coming soon"
                        className="px-3 py-1.5 border border-[var(--wireframe)] text-[var(--text-muted)] rounded-lg text-xs opacity-50 cursor-not-allowed"
                      >
                        Get Nudge
                      </button>
                    )}
                    <button
                      onClick={() =>
                        startConnection({ stopPropagation: () => {} } as React.MouseEvent, thought.id)
                      }
                      className="rounded-lg border border-mist bg-white px-3 py-1.5 text-xs text-smoke transition-colors hover:bg-[#F5F5F5]"
                    >
                      Connect →
                    </button>
                    <button
                      onClick={() => tracePathToOrigin(thought.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                        tracedPath.has(thought.id)
                          ? "border-[#333333] bg-[#FAFAFA] text-[#2A2A2A]"
                          : "border-mist bg-white text-smoke hover:bg-[#F5F5F5]"
                      }`}
                      title="Highlight path from this thought back to the starting idea"
                    >
                      Trace to Origin
                    </button>
                    <button
                      onClick={() => deleteThought(thought.id)}
                      className="rounded-lg border border-mist bg-white px-3 py-1.5 text-xs text-smoke transition-colors hover:bg-[#F5F5F5]"
                      title="Delete thought (Backspace)"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedThought(null)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                  {thought.content}
                </p>
                {thoughtConnections.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {thoughtConnections.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => deleteConnectionLocal(c.id)}
                        className="rounded bg-mist px-2 py-0.5 text-xs text-smoke transition-colors hover:bg-[#F5F5F5]"
                        title="Click to remove connection"
                      >
                        {c.from_thought_id === thought.id ? "→" : "←"}{" "}
                        #{thoughtMap.get(
                          c.from_thought_id === thought.id ? c.to_thought_id : c.from_thought_id,
                        )?.flow_order || "?"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* Scrollable canvas container */}
      <div
        ref={containerRef}
        className={`w-full h-full overflow-auto scrollbar-hide ${
          panning
            ? "cursor-grabbing"
            : selectedElement && selectedSubElement
              ? "cursor-crosshair"
              : "cursor-grab"
        }`}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        <div
          ref={canvasRef}
          className="relative"
          style={{
            width: canvasW,
            height: canvasH,
            transform: `scale(${zoom})`,
            transformOrigin: "0 0",
          }}
          onClick={handleCanvasClick}
          onDoubleClick={handleCanvasDoubleClick}
        >
          {/* Grid background */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="canvas-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EEEEEE" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#canvas-grid)" />
          </svg>

          {/* Connection lines (SVG overlay) */}
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={canvasW}
            height={canvasH}
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            style={{ zIndex: 1, overflow: "visible" }}
          >
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#333333" />
              </marker>
              <marker id="arrowhead-pending" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#666666" opacity={0.6} />
              </marker>
            </defs>
            {connections.map((conn) => {
              const from = thoughtMap.get(conn.from_thought_id);
              const to = thoughtMap.get(conn.to_thought_id);
              if (!from || !to) return null;
              const fromPos = getConnectorPos(from);
              // Tip lands on the LEFT edge of the target block (not its
              // center) so the arrow visibly "touches" the block.
              const toAnchor = getBlockLeftAnchor(to);
              const dx = toAnchor.x - fromPos.x;
              const dy = toAnchor.y - fromPos.y;
              // Force horizontal tangents at BOTH endpoints. Without a
              // minimum handle length, when a thought is dragged so the
              // target is roughly directly below the source the curve
              // collapses into a near-vertical line and the arrow marker —
              // which gets oriented to the path's tangent — ends up at a
              // weird angle that doesn't visually connect to the curve's
              // approach. Clamping the handle length guarantees the last
              // segment of the bezier is horizontal-ish, so the arrow head
              // always sits flush with the line.
              const handle = Math.max(80, Math.abs(dx) * 0.5, Math.abs(dy) * 0.4);
              const cx1 = fromPos.x + handle;
              const cy1 = fromPos.y;
              const cx2 = toAnchor.x - handle;
              const cy2 = toAnchor.y;
              const d = `M ${fromPos.x} ${fromPos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toAnchor.x} ${toAnchor.y}`;
              const isTraced = tracedConnections.has(conn.id);
              const isHovered = hoveredConnection === conn.id;
              // Midpoint of cubic bezier at t=0.5
              const mx = 0.125 * fromPos.x + 0.375 * cx1 + 0.375 * cx2 + 0.125 * toAnchor.x;
              const my = 0.125 * fromPos.y + 0.375 * cy1 + 0.375 * cy2 + 0.125 * toAnchor.y;
              return (
                <g key={conn.id}>
                  <path
                    d={d}
                    stroke={isHovered ? "#2A2A2A" : "#333333"}
                    strokeWidth={isTraced ? 3 : isHovered ? 2.5 : 1.75}
                    fill="none"
                    strokeLinecap="round"
                    markerEnd="url(#arrowhead)"
                    opacity={1}
                  />
                  {/* Wide transparent hit-target so the line is easy to hover/click.
                      pointerEvents="stroke" scopes events to the stroke area only,
                      leaving the canvas background fully interactive. */}
                  <path
                    d={d}
                    stroke="transparent"
                    strokeWidth={20}
                    fill="none"
                    style={{
                      pointerEvents: canMutate ? "stroke" : "none",
                      cursor: canMutate ? "pointer" : "default",
                    }}
                    onMouseEnter={() => canMutate && setHoveredConnection(conn.id)}
                    onMouseLeave={() => canMutate && setHoveredConnection(null)}
                    onClick={(e) => {
                      if (!canMutate) return;
                      e.stopPropagation();
                      deleteConnectionLocal(conn.id);
                    }}
                  />
                  {/* × delete button shown at bezier midpoint on hover */}
                  {canMutate && isHovered && (
                    <g
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredConnection(conn.id)}
                      onMouseLeave={() => setHoveredConnection(null)}
                      onClick={(e) => { e.stopPropagation(); deleteConnectionLocal(conn.id); }}
                    >
                      <circle cx={mx} cy={my} r={11} fill="white" stroke="#333333" strokeWidth={1.5} />
                      <text
                        x={mx}
                        y={my}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#333333"
                        fontSize={15}
                        fontWeight="bold"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        ×
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            {/* Pending connection line from source thought to draft (or to the
                saved draft position while the create-thought+connection round-trip
                is in-flight so the dashed line never flickers out). */}
            {(() => {
              const fromId = pendingConnectionFrom ?? inflightConnectionFrom;
              const toPos = draft
                ? { x: draft.x, y: draft.y }
                : inflightConnectionToPos;
              if (!fromId || !toPos) return null;
              const sourceThought = thoughtMap.get(fromId);
              if (!sourceThought) return null;
              const fromPos = getConnectorPos(sourceThought);
              const toX = toPos.x - ARROW_TIP_INSET;
              const toY = toPos.y + BLOCK_MIN_HEIGHT / 2;
              const dx = toX - fromPos.x;
              const dy = toY - fromPos.y;
              const handle = Math.max(80, Math.abs(dx) * 0.5, Math.abs(dy) * 0.4);
              const cx1 = fromPos.x + handle;
              const cy1 = fromPos.y;
              const cx2 = toX - handle;
              const cy2 = toY;
              const d = `M ${fromPos.x} ${fromPos.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toX} ${toY}`;
              return (
                <path
                  d={d}
                  stroke="#666666"
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                  markerEnd="url(#arrowhead-pending)"
                  opacity={0.5}
                  className="flow-line"
                />
              );
            })()}
          </svg>

          {/* Existing thought blocks */}
          {thoughts.map((thought) => {
            const pos = getThoughtPos(thought);
            const el = thought.element ? getElement(thought.element) : null;
            const subEl =
              thought.element && thought.sub_element
                ? getSubElement(thought.element, thought.sub_element)
                : null;
            const isSelected = selectedThought === thought.id;
            const isConnectSource = connectingFrom === thought.id;
            const elColor = thought.element ? getElementColor(thought.element) : null;
            const isBulkSelected = bulkSelected.has(thought.id);
            const isTraced = tracedPath.has(thought.id);
            // Stage 2 nudges are visually distinct: dashed border, subtle
            // purple wash, and an "AI Nudge" badge in the header. They
            // remain fully draggable / connectable / deletable — the user
            // owns them once they're on the canvas.
            const isNudge = !!thought.is_nudge;
            const isReflection = thought.kind === "reflection";
            const isTerrain = !!thought.is_terrain;
            const isFireStarterNode = !!thought.is_fire_starter_node;
            const terrainType = (thought.terrain_type || "fact").toLowerCase();
            const terrainStyle =
              TERRAIN_TYPE_STYLES[terrainType] || TERRAIN_TYPE_STYLES.uncertainty;
            const blockW = isFireStarterNode ? BLOCK_WIDTH_FIRE_STARTER : BLOCK_WIDTH;
            const blockMinH = isFireStarterNode
              ? BLOCK_MIN_HEIGHT_FIRE_STARTER
              : BLOCK_MIN_HEIGHT;

            return (
              <div
                key={thought.id}
                data-block
                // NOTE: explicit transition list — we MUST NOT include `left`
                // or `top` here (or use `transition-all`), because that causes
                // the block to lag ~300ms behind the cursor while dragging,
                // visibly trailing its connection arrows. Only animate cosmetic
                // properties (shadow, ring, border, bg).
                className={`absolute overflow-hidden rounded-xl border border-[#E5E5E5] bg-white shadow-sm transition-[box-shadow,border-color,background-color,transform] duration-300 select-none ${
                  isNudge || isReflection ? "border-dashed" : ""
                } ${isTerrain ? "border-dashed" : ""} ${
                  isFireStarterNode ? "border-2" : ""
                } ${
                  bulkSelectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                } ${
                  isBulkSelected
                    ? "shadow-md ring-2 ring-[#333333]"
                    : isTraced
                      ? "shadow-lg ring-2 ring-[#666666]"
                      : isSelected
                        ? "shadow-md ring-1 ring-[#333333]"
                        : isConnectSource
                          ? "shadow-md ring-1 ring-[#999999]"
                          : "hover:shadow-md"
                }`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: blockW,
                  minHeight: blockMinH,
                  zIndex: isSelected || dragging === thought.id ? 10 : isTraced ? 6 : isFireStarterNode ? 4 : 2,
                  borderLeftWidth: isTerrain ? 4 : undefined,
                  borderLeftColor: isTerrain ? terrainStyle.stripe : undefined,
                  backgroundColor: isFireStarterNode
                    ? FIRE_STARTER_STYLE.bg
                    : isTraced
                      ? "#FAFAFA"
                      : "#ffffff",
                  borderColor: isBulkSelected
                    ? "#333333"
                    : isTraced
                      ? "#666666"
                      : isSelected
                        ? "#333333"
                        : isConnectSource
                          ? "#999999"
                          : isTerrain
                            ? "#E5E5E5"
                            : isFireStarterNode
                              ? FIRE_STARTER_STYLE.border
                              : isNudge || isReflection
                                ? "#DDDDDD"
                                : "#E5E5E5",
                }}
                onClick={(e) => handleBlockClick(e, thought.id)}
                onMouseDown={(e) => handleBlockMouseDown(e, thought.id)}
              >
                {(() => {
                  const isElementTagged =
                    !isTerrain && el && (subEl || isFireStarterNode || isNudge || isReflection);
                  if (isElementTagged) {
                    return (
                      <ElementTaggedThoughtBody
                        elementId={thought.element!}
                        subElementName={subEl?.name}
                        elementName={el?.name}
                        isFireStarterNode={isFireStarterNode}
                        isNudge={isNudge}
                        isReflection={isReflection}
                        content={thought.content}
                        contentClassName={
                          isFireStarterNode
                            ? "text-sm font-medium leading-relaxed text-[#2A2A2A] line-clamp-8"
                            : "text-sm font-medium leading-relaxed text-[#2A2A2A] line-clamp-6"
                        }
                        createdAt={formatRelativeTime(thought.created_at)}
                        onConnectorClick={(e) => startConnection(e, thought.id)}
                      />
                    );
                  }
                  return (
                    <div className="p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {!el && !isTerrain && (
                            <span className="text-xs italic text-[#888888]">untagged</span>
                          )}
                        </div>
                        {isTerrain ? (
                          <span
                            className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${terrainStyle.pill}`}
                          >
                            {terrainStyle.label}
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-6 whitespace-pre-wrap text-xs leading-relaxed text-[#2A2A2A]">
                        {thought.content}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-[#888888]">
                          {formatRelativeTime(thought.created_at)}
                        </span>
                        <button
                          type="button"
                          data-connector
                          onClick={(e) => startConnection(e, thought.id)}
                          className="h-5 w-5 rounded-full border-2 border-[#CCCCCC] bg-white transition-transform hover:scale-110"
                          title="Drag to connect to another thought"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {/* Draft block (new thought being created) */}
          {draft &&
            (() => {
              const draftElColor =
                selectedElement && selectedSubElement
                  ? getElementColor(selectedElement)
                  : null;
              const draftSubEl =
                selectedElement && selectedSubElement
                  ? getSubElement(selectedElement, selectedSubElement)
                  : null;
              return (
                <div
                  data-draft
                  className="absolute overflow-hidden rounded-xl border-2 border-dashed shadow-lg cursor-move bg-white"
                  style={{
                    left: draft.x,
                    top: draft.y,
                    width: BLOCK_WIDTH,
                    minHeight: BLOCK_MIN_HEIGHT,
                    zIndex: 15,
                    backgroundColor: "#FAFAFA",
                    borderColor: "#DDDDDD",
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onMouseDown={handleDraftMouseDown}
                >
                  {draftSubEl && selectedElement ? (
                    <ElementIdentityStrip
                      elementId={selectedElement}
                      subElementName={draftSubEl.name}
                    />
                  ) : null}
                  <div className="px-3 py-3">
                    <textarea
                      ref={draftTextareaRef}
                      value={draftContent}
                      onChange={handleDraftChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveDraft();
                        }
                        if (e.key === "Escape") handleCancelDraft();
                      }}
                      placeholder={
                        selectedSubElement && selectedElement
                          ? getSubElement(selectedElement, selectedSubElement)?.description
                          : "Type your thought..."
                      }
                      className="w-full min-h-[80px] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] bg-transparent border-none outline-none resize-none scrollbar-hide"
                    />

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={handleSaveDraft}
                        disabled={!draftContent.trim()}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        Save
                      </button>
                      {selectedElement && selectedSubElement && draftContent.trim() && (
                        <button
                          disabled
                          title="Coming soon"
                          className="px-3 py-1.5 border border-[var(--wireframe)] text-[var(--text-muted)] rounded-lg text-xs opacity-50 cursor-not-allowed"
                        >
                          Nudge
                        </button>
                      )}
                      <button
                        onClick={handleCancelDraft}
                        className="px-3 py-1.5 text-[var(--text-muted)] rounded-lg text-xs hover:text-[var(--text-primary)] transition-colors"
                      >
                        Cancel
                      </button>
                      <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                        Enter to save · Shift+Enter newline
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
