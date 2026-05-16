"""
Ignite mode — application workspace (ported patterns from Weaponry, DramaRama schema).
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Response
from app.core.security import get_current_user
from app.core.rate_limiter import rate_limit_user
from app.adapters.supabase_adapter import (
    get_supabase_client,
    SupabaseCourseRepository,
    SupabaseCoursePuzzleRepository,
    SupabaseFireStarterRepository,
)
from app.adapters.claude_adapter import ClaudeStreamingAdapter
from app.api.streaming import sse_stream, streaming_sse_response
from app.domain.services import (
    ignite_guide_system_prompt,
    ignite_node_nudge_prompt,
    build_terrain_mapping_prompt,
    build_fire_starter_application_prompt,
    ignite_match_puzzle_prompt,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ignite"])

client = get_supabase_client()
course_repo = SupabaseCourseRepository()
puzzle_repo = SupabaseCoursePuzzleRepository()
fire_starter_repo = SupabaseFireStarterRepository(client)
llm = ClaudeStreamingAdapter()


CANVAS_CENTER = 15800.0
TERRAIN_BASE_X = CANVAS_CENTER - 1100.0
TERRAIN_BASE_Y = CANVAS_CENTER - 520.0
FS_BASE_X = CANVAS_CENTER + 900.0
FS_BASE_Y = CANVAS_CENTER
TERRAIN_TYPE_Y = {
    "fact": 0,
    "history": 240,
    "constraint": 480,
    "uncertainty": 720,
}
VALID_TERRAIN_TYPES = ("fact", "history", "constraint", "uncertainty")


def _element_code_to_storage(element_code: str) -> tuple[str | None, str | None]:
    """Map fire_1_0 style codes to (element, sub_element) for DB storage."""
    code = (element_code or "").strip().lower()
    if not code:
        return None, None
    if code == "change":
        return "change", None
    parts = code.split("_")
    if len(parts) >= 2 and parts[0] in ("earth", "fire", "air", "water"):
        el = parts[0]
        try:
            idx = int(parts[1])
            return el, f"{el}-{idx}"
        except ValueError:
            pass
    if code in ("earth", "fire", "air", "water"):
        return code, f"{code}-1"
    return None, None


def _terrain_positions(nodes: list[dict]) -> list[tuple[float, float]]:
    type_counters: dict[str, int] = {t: 0 for t in VALID_TERRAIN_TYPES}
    positions: list[tuple[float, float]] = []
    for n in nodes:
        tt = (n.get("terrain_type") or "fact").lower()
        if tt not in VALID_TERRAIN_TYPES:
            tt = "uncertainty"
        row = type_counters[tt]
        type_counters[tt] += 1
        x = TERRAIN_BASE_X + (row % 2) * 300.0
        y = TERRAIN_BASE_Y + TERRAIN_TYPE_Y.get(tt, 0) + (row // 2) * 120.0
        positions.append((x, y))
    return positions


def _fire_starter_position(flow_order: int) -> tuple[float, float]:
    order = max(1, int(flow_order))
    return FS_BASE_X + (order - 1) * 380.0, FS_BASE_Y


def _terrain_type_counts(nodes: list[dict]) -> dict[str, int]:
    counts = {t: 0 for t in VALID_TERRAIN_TYPES}
    for n in nodes:
        tt = (n.get("terrain_type") or "fact").lower()
        if tt in counts:
            counts[tt] += 1
    return counts


def _build_ignite_opening_message(
    *,
    terrain_nodes: list[dict],
    matched_puzzle_title: str,
    fire_starter_name: str,
    match_reasoning: str,
    insights_after_applying: str,
    suggested_next_step: str,
) -> str:
    counts = _terrain_type_counts(terrain_nodes)
    n = len(terrain_nodes)
    parts_desc: list[str] = []
    if counts["fact"]:
        parts_desc.append(
            f"{counts['fact']} fact{'s' if counts['fact'] != 1 else ''} about what's happening"
        )
    if counts["history"]:
        parts_desc.append(
            f"{counts['history']} piece{'s' if counts['history'] != 1 else ''} of history"
        )
    if counts["constraint"]:
        parts_desc.append(
            f"{counts['constraint']} constraint{'s' if counts['constraint'] != 1 else ''}"
        )
    if counts["uncertainty"]:
        parts_desc.append(
            f"{counts['uncertainty']} uncertaint{'ies' if counts['uncertainty'] != 1 else 'y'}"
        )
    terrain_list = ", ".join(parts_desc) if parts_desc else "the pieces of your situation"

    part1 = (
        f"I read your problem and laid out what I'm seeing. On the left, I've mapped {n} terrain "
        f"piece{'s' if n != 1 else ''} — {terrain_list}. The facts are the ground. The history tells "
        "me what's been tried. The constraint is what's holding you back from acting freely. The "
        "uncertainty is where the puzzle still has shape — that's where the work is."
    )

    part2 = (
        f"I looked across the Forge sessions you've completed and matched this to **{matched_puzzle_title}**. "
        f"{match_reasoning.strip()} That's why I'm applying your Fire Starter, **{fire_starter_name}**."
    )

    part3 = (
        "With the Fire Starter applied to your terrain, here's what comes into focus: "
        f"{insights_after_applying.strip()}"
    )

    part4 = (
        "This isn't the answer. It's a way of seeing the problem you didn't have a minute ago. "
        f"{suggested_next_step.strip()} From here: extend the chain, drop your own thoughts, fail fast, "
        "ask the AI to fan out a node. The terrain is yours. The Fire Starter is yours. Go to work."
    )

    return f"{part1}\n\n{part2}\n\n{part3}\n\n{part4}"


def _parse_json_obj(raw: str) -> dict:
    t = (raw or "").strip()
    if t.startswith("```"):
        lines = t.split("\n")[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        t = "\n".join(lines)
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        a, b = t.find("{"), t.rfind("}")
        if a >= 0 and b > a:
            return json.loads(t[a : b + 1])
        raise


def _verify_problem(problem_id: str, user_id: str) -> dict:
    res = (
        client.table("ignite_problems")
        .select("*")
        .eq("id", problem_id)
        .single()
        .execute()
    )
    row = res.data
    if not row or row.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Ignite problem not found")
    return row


@router.get("/ignite")
async def list_ignite_problems(
    course_id: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    """List active Ignite problems for the signed-in user."""
    user = current_user["db_user"]
    q = (
        client.table("ignite_problems")
        .select("id, title, description, course_id, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
    )
    if course_id:
        q = q.eq("course_id", course_id)
    res = q.execute()
    problems = res.data or []
    if not problems:
        return {"problems": []}

    ids = [p["id"] for p in problems]
    th_res = (
        client.table("ignite_thoughts")
        .select("ignite_problem_id, is_terrain, is_fire_starter_node")
        .in_("ignite_problem_id", ids)
        .execute()
    )
    user_counts: dict[str, int] = {pid: 0 for pid in ids}
    for row in th_res.data or []:
        pid = row.get("ignite_problem_id")
        if not pid:
            continue
        if row.get("is_terrain") or row.get("is_fire_starter_node"):
            continue
        user_counts[str(pid)] = user_counts.get(str(pid), 0) + 1

    # Re-fetch with applied_fire_starter_id for status pills
    q2 = (
        client.table("ignite_problems")
        .select(
            "id, title, description, course_id, status, created_at, applied_fire_starter_id"
        )
        .eq("user_id", user.id)
        .in_("id", ids)
        .order("created_at", desc=True)
    )
    if course_id:
        q2 = q2.eq("course_id", course_id)
    enriched = q2.execute().data or problems
    for p in enriched:
        p["user_thought_count"] = user_counts.get(str(p["id"]), 0)
    return {"problems": enriched}


@router.post("/ignite")
async def create_ignite_problem(
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """Create terrain + match Forge session + apply Fire Starter chain."""
    user = current_user["db_user"]
    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    course_id = (payload.get("course_id") or "").strip()
    if not title or not description or not course_id:
        raise HTTPException(status_code=400, detail="title, description, and course_id are required")

    course = await course_repo.get_by_id(course_id)
    if not course or course.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    starters = fire_starter_repo.list_by_course(course_id)
    if not starters:
        raise HTTPException(
            status_code=400,
            detail="Earn at least one Fire Starter in Forge for this goal before Ignite.",
        )

    ins = (
        client.table("ignite_problems")
        .insert(
            {
                "user_id": user.id,
                "course_id": course_id,
                "title": title,
                "description": description,
                "status": "active",
            }
        )
        .execute()
    )
    problem = ins.data[0]
    pid = problem["id"]

    # --- Terrain mapping ---
    try:
        raw_terrain = await llm.generate_text(
            prompt=build_terrain_mapping_prompt(title, description),
            system="Return ONLY JSON.",
            max_tokens=2000,
        )
        terrain = _parse_json_obj(raw_terrain)
    except Exception as e:
        logger.error("terrain gen failed: %s", e)
        terrain = {
            "nodes": [
                {"content": title[:120], "terrain_type": "fact"},
                {"content": description[:140], "terrain_type": "uncertainty"},
            ],
            "connections": [{"from_index": 0, "to_index": 1}],
        }

    terrain_nodes = terrain.get("nodes") or []
    if not terrain_nodes:
        terrain_nodes = [
            {"content": title[:120], "terrain_type": "fact"},
            {"content": "What remains unclear", "terrain_type": "uncertainty"},
        ]

    terrain_positions = _terrain_positions(terrain_nodes)
    terrain_ids: list[str] = []
    for i, n in enumerate(terrain_nodes):
        content = (n.get("content") or "Note")[:220]
        tt = (n.get("terrain_type") or "fact").lower()
        if tt not in VALID_TERRAIN_TYPES:
            tt = "uncertainty"
        px, py = terrain_positions[i] if i < len(terrain_positions) else (TERRAIN_BASE_X, TERRAIN_BASE_Y)
        row = (
            client.table("ignite_thoughts")
            .insert(
                {
                    "ignite_problem_id": pid,
                    "user_id": user.id,
                    "content": content,
                    "element": None,
                    "sub_element": None,
                    "pos_x": px,
                    "pos_y": py,
                    "is_terrain": True,
                    "is_fire_starter_node": False,
                    "terrain_type": tt,
                    "flow_order": i + 1,
                }
            )
            .execute()
        )
        terrain_ids.append(row.data[0]["id"])

    for c in terrain.get("connections") or []:
        try:
            fi = int(c.get("from_index"))
            ti = int(c.get("to_index"))
        except (TypeError, ValueError):
            continue
        if 0 <= fi < len(terrain_ids) and 0 <= ti < len(terrain_ids) and fi != ti:
            client.table("ignite_thought_connections").insert(
                {
                    "ignite_problem_id": pid,
                    "from_thought_id": terrain_ids[fi],
                    "to_thought_id": terrain_ids[ti],
                }
            ).execute()

    terrain_summary = [
        {"content": n.get("content"), "terrain_type": n.get("terrain_type")}
        for n in terrain_nodes
    ]

    # --- Match Forge puzzle ---
    puzzles = await puzzle_repo.get_by_course(course_id)
    candidates = []
    for p in puzzles:
        if p.status != "completed":
            continue
        if any(str(s.get("course_puzzle_id")) == str(p.id) for s in starters):
            candidates.append(
                {
                    "course_puzzle_id": str(p.id),
                    "title": p.title,
                    "puzzle_text": p.puzzle_text,
                    "primary_element": p.primary_element,
                }
            )

    matched_puzzle_id = None
    fs_row = starters[0]
    if not candidates:
        matched_puzzle_id = str(fs_row.get("course_puzzle_id"))
    else:
        try:
            raw_m = await llm.generate_text(
                prompt=ignite_match_puzzle_prompt(
                    description, json.dumps(candidates, ensure_ascii=False)
                ),
                system="Return ONLY JSON.",
                max_tokens=600,
            )
            mj = _parse_json_obj(raw_m)
            matched_puzzle_id = mj.get("best_course_puzzle_id")
        except Exception as e:
            logger.warning("match failed: %s", e)
            matched_puzzle_id = str(candidates[0]["course_puzzle_id"])

    if matched_puzzle_id:
        fs_row = next(
            (s for s in starters if str(s.get("course_puzzle_id")) == str(matched_puzzle_id)),
            starters[0],
        )

    combo = fs_row.get("element_combination") or []
    if isinstance(combo, str):
        try:
            combo = json.loads(combo)
        except Exception:
            combo = []

    puzzle = await puzzle_repo.get_by_id(str(matched_puzzle_id)) if matched_puzzle_id else None
    ptitle = puzzle.title if puzzle else "your Forge session"
    puzzle_text = puzzle.puzzle_text if puzzle else ""
    primary_el = puzzle.primary_element if puzzle else "synthesis"
    fs_name = fs_row.get("name") or "your Fire Starter"
    fs_desc = fs_row.get("description") or ""

    # --- Apply Fire Starter (applied thinking moves) ---
    fs_payload: dict = {}
    try:
        raw_fs = await llm.generate_text(
            prompt=build_fire_starter_application_prompt(
                problem_title=title,
                problem_description=description,
                terrain_json=json.dumps(terrain_summary, ensure_ascii=False),
                puzzle_title=ptitle,
                puzzle_text=puzzle_text,
                primary_element=primary_el,
                fire_starter_name=fs_name,
                fire_starter_description=fs_desc,
                element_combination_json=json.dumps(combo, ensure_ascii=False),
            ),
            system="Return ONLY JSON.",
            max_tokens=2500,
        )
        fs_payload = _parse_json_obj(raw_fs)
    except Exception as e:
        logger.error("fire starter application failed: %s", e)
        fs_payload = {}

    fs_nodes = fs_payload.get("nodes") or []
    if not fs_nodes and combo:
        for j, el in enumerate(combo[:6]):
            el_s = str(el)
            el_base, sub = _element_code_to_storage(el_s)
            fs_nodes.append(
                {
                    "element": el_s,
                    "element_display": el_s,
                    "content": f"Applied move for {el_s} on this problem.",
                    "flow_order": j + 1,
                }
            )
            if el_base:
                fs_nodes[-1]["_element"] = el_base
                fs_nodes[-1]["_sub_element"] = sub

    anchor_idx = 0
    try:
        anchor_idx = int(fs_payload.get("anchor_terrain_index", 0))
    except (TypeError, ValueError):
        anchor_idx = 0
    if not terrain_ids:
        anchor_idx = 0
    elif anchor_idx < 0 or anchor_idx >= len(terrain_ids):
        anchor_idx = 0

    fs_nodes_sorted = sorted(fs_nodes, key=lambda n: int(n.get("flow_order") or 0))
    fs_ids: list[str] = []
    prev_fs_id: str | None = None
    for n in fs_nodes_sorted[:8]:
        el_code = str(n.get("element") or "")
        el_base, sub = _element_code_to_storage(el_code)
        if n.get("_element"):
            el_base = n.get("_element")
            sub = n.get("_sub_element")
        content = (n.get("content") or "")[:400]
        if not content.strip():
            continue
        flow_order = int(n.get("flow_order") or len(fs_ids) + 1)
        px, py = _fire_starter_position(flow_order)
        nrow = (
            client.table("ignite_thoughts")
            .insert(
                {
                    "ignite_problem_id": pid,
                    "user_id": user.id,
                    "content": content,
                    "element": el_base,
                    "sub_element": sub,
                    "pos_x": px,
                    "pos_y": py,
                    "is_terrain": False,
                    "is_fire_starter_node": True,
                    "terrain_type": None,
                    "flow_order": flow_order,
                }
            )
            .execute()
        )
        nid = nrow.data[0]["id"]
        fs_ids.append(nid)
        if prev_fs_id:
            client.table("ignite_thought_connections").insert(
                {
                    "ignite_problem_id": pid,
                    "from_thought_id": prev_fs_id,
                    "to_thought_id": nid,
                }
            ).execute()
        prev_fs_id = nid

    if fs_ids and terrain_ids:
        client.table("ignite_thought_connections").insert(
            {
                "ignite_problem_id": pid,
                "from_thought_id": terrain_ids[anchor_idx],
                "to_thought_id": fs_ids[0],
            }
        ).execute()

    if matched_puzzle_id:
        client.table("ignite_problems").update(
            {
                "applied_fire_starter_id": fs_row["id"],
                "matched_course_puzzle_id": matched_puzzle_id,
            }
        ).eq("id", pid).execute()

    match_reasoning = (
        fs_payload.get("match_reasoning")
        or "The structural shape of your real problem echoes the thinking pattern you trained in Forge."
    )
    insights = (
        fs_payload.get("insights_after_applying")
        or "The Fire Starter reframes which parts of the terrain matter most and which paths are dead ends."
    )
    next_step = (
        fs_payload.get("suggested_next_step")
        or "Walk the chain on the right, then add your own thoughts where the terrain still has gaps."
    )

    if fs_ids:
        msg = _build_ignite_opening_message(
            terrain_nodes=terrain_nodes,
            matched_puzzle_title=ptitle,
            fire_starter_name=fs_name,
            match_reasoning=str(match_reasoning),
            insights_after_applying=str(insights),
            suggested_next_step=str(next_step),
        )
    else:
        msg = (
            "I mapped your terrain on the left. I couldn't apply a Fire Starter chain just now — "
            "start from the terrain pieces and add your own thoughts; try creating the problem again "
            "if the chain is missing."
        )

    client.table("ignite_chat_messages").insert(
        {
            "ignite_problem_id": pid,
            "user_id": user.id,
            "role": "assistant",
            "content": msg,
            "metadata": {},
        }
    ).execute()

    return {"ignite_problem_id": pid}


@router.get("/ignite/{ignite_problem_id}")
async def get_ignite_problem(
    ignite_problem_id: str,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    prob = _verify_problem(ignite_problem_id, user.id)
    th = (
        client.table("ignite_thoughts")
        .select("*")
        .eq("ignite_problem_id", ignite_problem_id)
        .order("flow_order")
        .execute()
    )
    conn = (
        client.table("ignite_thought_connections")
        .select("*")
        .eq("ignite_problem_id", ignite_problem_id)
        .execute()
    )
    msgs = (
        client.table("ignite_chat_messages")
        .select("*")
        .eq("ignite_problem_id", ignite_problem_id)
        .order("created_at")
        .execute()
    )
    return {
        "problem": prob,
        "thoughts": th.data or [],
        "connections": conn.data or [],
        "messages": msgs.data or [],
    }


@router.post("/ignite/{ignite_problem_id}/guide")
async def ignite_guide_stream(
    ignite_problem_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    prob = _verify_problem(ignite_problem_id, user.id)
    if not rate_limit_user(user.id, "canvas_chat"):
        raise HTTPException(status_code=429, detail="Slow down a moment.")

    history = payload.get("messages") or []
    user_message = (payload.get("user_message") or "").strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="user_message required")

    fs_name = fs_elems = fs_desc = fs_flow = matched_title = None
    if prob.get("applied_fire_starter_id"):
        fs = fire_starter_repo.get(str(prob["applied_fire_starter_id"]))
        if fs:
            fs_name = fs.get("name")
            fs_desc = fs.get("description") or ""
            ec = fs.get("element_combination") or []
            if isinstance(ec, str):
                try:
                    ec = json.loads(ec)
                except Exception:
                    ec = []
            fs_elems = ", ".join(str(x) for x in ec)
            flow = fs.get("flow_of_ideas") or []
            if isinstance(flow, str):
                try:
                    flow = json.loads(flow)
                except Exception:
                    flow = []
            fs_flow = json.dumps(flow, ensure_ascii=False)[:3000]

    if prob.get("matched_course_puzzle_id"):
        mp = await puzzle_repo.get_by_id(str(prob["matched_course_puzzle_id"]))
        if mp:
            matched_title = mp.title

    th = (
        client.table("ignite_thoughts")
        .select("content, is_terrain, is_fire_starter_node, terrain_type, flow_order, element")
        .eq("ignite_problem_id", ignite_problem_id)
        .order("flow_order")
        .execute()
    )
    terrain_lines = []
    fs_lines = []
    for t in th.data or []:
        content = (t.get("content") or "").strip()
        if not content:
            continue
        if t.get("is_terrain"):
            tt = t.get("terrain_type") or "fact"
            terrain_lines.append(f"- [{tt}] {content}")
        elif t.get("is_fire_starter_node"):
            el = t.get("element") or ""
            order = t.get("flow_order") or ""
            fs_lines.append(f"- ({order}) [{el}] {content}")

    opening_msg = ""
    first_asst = (
        client.table("ignite_chat_messages")
        .select("content")
        .eq("ignite_problem_id", ignite_problem_id)
        .eq("role", "assistant")
        .order("created_at")
        .limit(1)
        .execute()
    )
    if first_asst.data:
        opening_msg = (first_asst.data[0].get("content") or "").strip()

    system = ignite_guide_system_prompt(
        problem_title=prob.get("title") or "",
        problem_description=prob.get("description") or "",
        fire_starter_name=fs_name,
        fire_starter_elements=fs_elems,
        fire_starter_description=fs_desc,
        fire_starter_flow=fs_flow,
        matched_puzzle_title=matched_title,
        terrain_summary="\n".join(terrain_lines) if terrain_lines else None,
        applied_fs_nodes="\n".join(fs_lines) if fs_lines else None,
        opening_guide_message=opening_msg or None,
    )
    messages = []
    for m in history:
        role = "user" if (m.get("role") or "").lower() == "user" else "assistant"
        messages.append({"role": role, "content": (m.get("content") or "").strip()})
    messages.append({"role": "user", "content": user_message})

    async def gen():
        async for ev in sse_stream(
            llm.generate_stream_with_messages(
                messages=messages,
                system=system,
                max_tokens=900,
            )
        ):
            yield ev

    return streaming_sse_response(gen)


@router.post("/ignite/{ignite_problem_id}/nudge")
async def ignite_nudge(
    ignite_problem_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    _verify_problem(ignite_problem_id, user.id)
    content = (payload.get("content") or "").strip()
    element = payload.get("element")
    sub = payload.get("sub_element")
    prompt = ignite_node_nudge_prompt(content, element, sub)
    text = await llm.generate_text(prompt=prompt, system="Be brief.", max_tokens=200)
    return {"nudge": text.strip()}


@router.post("/ignite/{ignite_problem_id}/organize")
async def ignite_organize(
    ignite_problem_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Stub organizer — returns success without layout changes (TODO: full layout)."""
    _verify_problem(ignite_problem_id, current_user["db_user"].id)
    # TODO: call Claude for positions + persist updates
    return {"ok": True, "message": "Organize is a stub — layout unchanged."}


@router.post("/ignite/{ignite_problem_id}/fan3")
async def ignite_fan3(
    ignite_problem_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    _verify_problem(ignite_problem_id, user.id)
    parent_id = payload.get("parent_thought_id")
    if not parent_id:
        raise HTTPException(status_code=400, detail="parent_thought_id required")
    parent = (
        client.table("ignite_thoughts")
        .select("*")
        .eq("id", parent_id)
        .single()
        .execute()
    ).data
    if not parent:
        raise HTTPException(status_code=404, detail="Thought not found")
    px, py = float(parent.get("pos_x") or 0), float(parent.get("pos_y") or 0)
    created = []
    for k in range(3):
        row = (
            client.table("ignite_thoughts")
            .insert(
                {
                    "ignite_problem_id": ignite_problem_id,
                    "user_id": user.id,
                    "content": f"Branch {k+1}: what else follows?",
                    "element": parent.get("element"),
                    "sub_element": parent.get("sub_element"),
                    "pos_x": px + 320,
                    "pos_y": py + (k - 1) * 140,
                    "is_terrain": False,
                    "is_fire_starter_node": False,
                    "flow_order": 500 + k,
                }
            )
            .execute()
        )
        tid = row.data[0]["id"]
        client.table("ignite_thought_connections").insert(
            {
                "ignite_problem_id": ignite_problem_id,
                "from_thought_id": parent_id,
                "to_thought_id": tid,
            }
        ).execute()
        created.append(row.data[0])
    return {"thoughts": created}


@router.post("/ignite/{ignite_problem_id}/forward-flow")
async def ignite_forward_flow(
    ignite_problem_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """Stub — TODO stream Weaponry-style forward flow."""
    _verify_problem(ignite_problem_id, current_user["db_user"].id)
    return {"steps": [], "message": "Forward flow stub — TODO port streaming walk."}


@router.post("/ignite/{ignite_problem_id}/extract")
async def ignite_extract(
    ignite_problem_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    _verify_problem(ignite_problem_id, current_user["db_user"].id)
    node = (payload.get("content") or "").strip()
    prompt = f"Ignite — extract one crisp insight (1-2 sentences) implied by:\n{node}"
    insight = await llm.generate_text(prompt=prompt, system="Be direct.", max_tokens=200)
    return {"insight": insight.strip()}


@router.post("/ignite/{ignite_problem_id}/structural-potential")
async def ignite_structural_potential(
    ignite_problem_id: str,
    current_user: dict = Depends(get_current_user),
):
    _verify_problem(ignite_problem_id, current_user["db_user"].id)
    th = (
        client.table("ignite_thoughts")
        .select("id,content")
        .eq("ignite_problem_id", ignite_problem_id)
        .execute()
    )
    lines = "\n".join(f'- {r["id"]}: {r["content"][:120]}' for r in (th.data or []))
    prompt = f"""Ignite canvas nodes:
{lines}
Which single node id has the most structural potential to branch from? Return ONLY JSON: {{"thought_id": "<uuid>", "reason": "..."}}"""
    raw = await llm.generate_text(prompt=prompt, system="JSON only.", max_tokens=400)
    try:
        data = _parse_json_obj(raw)
    except Exception:
        return {"thought_id": None, "reason": "Could not parse model output."}
    return data


@router.post("/ignite/{ignite_problem_id}/thoughts")
async def ignite_create_thought(
    ignite_problem_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    _verify_problem(ignite_problem_id, user.id)
    existing = (
        client.table("ignite_thoughts")
        .select("flow_order")
        .eq("ignite_problem_id", ignite_problem_id)
        .order("flow_order", desc=True)
        .limit(1)
        .execute()
    )
    next_order = (existing.data[0].get("flow_order") or 0) + 1 if existing.data else 1
    row = (
        client.table("ignite_thoughts")
        .insert(
            {
                "ignite_problem_id": ignite_problem_id,
                "user_id": user.id,
                "content": (payload.get("content") or "").strip() or "…",
                "element": payload.get("element"),
                "sub_element": payload.get("sub_element"),
                "pos_x": float(payload.get("pos_x") or 0),
                "pos_y": float(payload.get("pos_y") or 0),
                "is_terrain": False,
                "is_fire_starter_node": False,
                "flow_order": next_order,
            }
        )
        .execute()
    )
    return row.data[0]


@router.patch("/ignite/thoughts/{thought_id}/position")
async def ignite_patch_thought_position(
    thought_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    t = (
        client.table("ignite_thoughts")
        .select("ignite_problem_id")
        .eq("id", thought_id)
        .single()
        .execute()
    ).data
    if not t:
        raise HTTPException(status_code=404, detail="Thought not found")
    _verify_problem(t["ignite_problem_id"], user.id)
    upd = (
        client.table("ignite_thoughts")
        .update(
            {
                "pos_x": float(payload.get("pos_x") or 0),
                "pos_y": float(payload.get("pos_y") or 0),
            }
        )
        .eq("id", thought_id)
        .execute()
    )
    return upd.data[0]


@router.delete("/ignite/thoughts/{thought_id}")
async def ignite_delete_thought(
    thought_id: str,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    t = (
        client.table("ignite_thoughts")
        .select("ignite_problem_id")
        .eq("id", thought_id)
        .single()
        .execute()
    ).data
    if not t:
        raise HTTPException(status_code=404, detail="Not found")
    _verify_problem(t["ignite_problem_id"], user.id)
    client.table("ignite_thought_connections").delete().eq("from_thought_id", thought_id).execute()
    client.table("ignite_thought_connections").delete().eq("to_thought_id", thought_id).execute()
    client.table("ignite_thoughts").delete().eq("id", thought_id).execute()
    return {"ok": True}


@router.post("/ignite/{ignite_problem_id}/connections")
async def ignite_create_connection(
    ignite_problem_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    _verify_problem(ignite_problem_id, user.id)
    fid, tid = payload.get("from_thought_id"), payload.get("to_thought_id")
    if not fid or not tid or fid == tid:
        raise HTTPException(status_code=400, detail="Invalid connection")
    row = (
        client.table("ignite_thought_connections")
        .insert(
            {
                "ignite_problem_id": ignite_problem_id,
                "from_thought_id": fid,
                "to_thought_id": tid,
            }
        )
        .execute()
    )
    return row.data[0]


@router.delete("/ignite/connections/{connection_id}", status_code=204)
async def ignite_delete_connection(
    connection_id: str,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    row = (
        client.table("ignite_thought_connections")
        .select("ignite_problem_id")
        .eq("id", connection_id)
        .single()
        .execute()
    ).data
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    _verify_problem(row["ignite_problem_id"], user.id)
    client.table("ignite_thought_connections").delete().eq("id", connection_id).execute()
    return Response(status_code=204)


@router.post("/ignite/{ignite_problem_id}/chat-messages")
async def ignite_post_chat_message(
    ignite_problem_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    _verify_problem(ignite_problem_id, user.id)
    role = (payload.get("role") or "user").lower()
    content = (payload.get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="content required")
    row = (
        client.table("ignite_chat_messages")
        .insert(
            {
                "ignite_problem_id": ignite_problem_id,
                "user_id": user.id,
                "role": role,
                "content": content,
                "metadata": payload.get("metadata") or {},
            }
        )
        .execute()
    )
    return row.data[0]


@router.get("/ignite-mentions/search")
async def ignite_mentions_search(
    q: str = "",
    current_user: dict = Depends(get_current_user),
):
    """TODO: cross-search ignite problems and Forge puzzles for @-mentions."""
    _ = (current_user, q)
    return {"results": []}
