"""
Ignite mode — application workspace (ported patterns from Weaponry, DramaRama schema).
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse

from app.core.security import get_current_user
from app.core.rate_limiter import rate_limit_user
from app.adapters.supabase_adapter import (
    get_supabase_client,
    SupabaseCourseRepository,
    SupabaseCoursePuzzleRepository,
    SupabaseFireStarterRepository,
)
from app.adapters.claude_adapter import ClaudeStreamingAdapter
from app.api.streaming import sse_stream
from app.domain.services import (
    ignite_guide_system_prompt,
    ignite_node_nudge_prompt,
    ignite_terrain_prompt,
    ignite_match_puzzle_prompt,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ignite"])

client = get_supabase_client()
course_repo = SupabaseCourseRepository()
puzzle_repo = SupabaseCoursePuzzleRepository()
fire_starter_repo = SupabaseFireStarterRepository(client)
llm = ClaudeStreamingAdapter()


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

    # --- Terrain ---
    try:
        raw_terrain = await llm.generate_text(
            prompt=ignite_terrain_prompt(title, description),
            system="Return ONLY JSON.",
            max_tokens=2000,
        )
        terrain = _parse_json_obj(raw_terrain)
    except Exception as e:
        logger.error("terrain gen failed: %s", e)
        terrain = {
            "nodes": [
                {"id": "t1", "content": "What you know", "kind": "known"},
                {"id": "t2", "content": "What you don't know", "kind": "unknown"},
            ],
            "connections": [{"from": "t1", "to": "t2"}],
        }

    temp_to_real: dict[str, str] = {}
    nodes = terrain.get("nodes") or []
    base_x, base_y = 15800.0, 15800.0
    for i, n in enumerate(nodes):
        nid = str(n.get("id") or f"t{i}")
        content = (n.get("content") or "Note")[:200]
        x = base_x + (i % 3) * 320
        y = base_y + (i // 3) * 200
        row = (
            client.table("ignite_thoughts")
            .insert(
                {
                    "ignite_problem_id": pid,
                    "user_id": user.id,
                    "content": content,
                    "element": None,
                    "sub_element": None,
                    "pos_x": x,
                    "pos_y": y,
                    "is_terrain": True,
                    "is_fire_starter_node": False,
                    "flow_order": i + 1,
                }
            )
            .execute()
        )
        temp_to_real[nid] = row.data[0]["id"]

    for c in terrain.get("connections") or []:
        fa, tb = c.get("from"), c.get("to")
        if fa in temp_to_real and tb in temp_to_real:
            client.table("ignite_thought_connections").insert(
                {
                    "ignite_problem_id": pid,
                    "from_thought_id": temp_to_real[fa],
                    "to_thought_id": temp_to_real[tb],
                }
            ).execute()

    # --- Match puzzle ---
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
                }
            )

    matched_puzzle_id = None
    applied_fs = None
    if not candidates:
        fs_row = starters[0]
        matched_puzzle_id = str(fs_row.get("course_puzzle_id"))
        applied_fs = fs_row
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
        applied_fs = fs_row
        combo = fs_row.get("element_combination") or []
        if isinstance(combo, str):
            try:
                combo = json.loads(combo)
            except Exception:
                combo = []
        anchor_tid = next(iter(temp_to_real.values()), None)
        prev = anchor_tid
        ox = base_x + 400
        oy = base_y
        for j, el in enumerate(combo[:6]):
            el_s = str(el).lower()
            sub = f"{el_s}-1" if el_s in ("earth", "fire", "air", "water") else "earth-1"
            content = f"Apply {el_s}: extend from your Fire Starter"
            nrow = (
                client.table("ignite_thoughts")
                .insert(
                    {
                        "ignite_problem_id": pid,
                        "user_id": user.id,
                        "content": content[:220],
                        "element": el_s if el_s != "change" else "change",
                        "sub_element": sub,
                        "pos_x": ox + j * 300,
                        "pos_y": oy,
                        "is_terrain": False,
                        "is_fire_starter_node": True,
                        "flow_order": 100 + j,
                    }
                )
                .execute()
            )
            nid = nrow.data[0]["id"]
            if prev:
                client.table("ignite_thought_connections").insert(
                    {
                        "ignite_problem_id": pid,
                        "from_thought_id": prev,
                        "to_thought_id": nid,
                    }
                ).execute()
            prev = nid

        client.table("ignite_problems").update(
            {
                "applied_fire_starter_id": fs_row["id"],
                "matched_course_puzzle_id": matched_puzzle_id,
            }
        ).eq("id", pid).execute()

        puzzle = await puzzle_repo.get_by_id(str(matched_puzzle_id))
        ptitle = puzzle.title if puzzle else "your Forge session"
        fs_name = fs_row.get("name") or "your Fire Starter"
        combo_s = ", ".join(str(x) for x in (combo or []))
        msg = (
            f"I matched your problem to your Forge session on **{ptitle}**. "
            f"I'm applying your Fire Starter **{fs_name}** — it uses {combo_s or 'your saved element mix'}. "
            "Here's where I think your thinking should start: follow the highlighted chain from your terrain."
        )
    else:
        msg = (
            "I couldn't match a specific Forge puzzle, but your latest Fire Starter is loaded as context. "
            "Start from the terrain nodes and extend outward."
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

    fs_name = fs_elems = None
    if prob.get("applied_fire_starter_id"):
        fs = fire_starter_repo.get(str(prob["applied_fire_starter_id"]))
        if fs:
            fs_name = fs.get("name")
            ec = fs.get("element_combination") or []
            if isinstance(ec, str):
                try:
                    ec = json.loads(ec)
                except Exception:
                    ec = []
            fs_elems = ", ".join(str(x) for x in ec)

    system = ignite_guide_system_prompt(
        problem_title=prob.get("title") or "",
        problem_description=prob.get("description") or "",
        fire_starter_name=fs_name,
        fire_starter_elements=fs_elems,
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

    return StreamingResponse(gen(), media_type="text/event-stream")


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
