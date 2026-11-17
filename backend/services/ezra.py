"""Ezra, the info desk chat helper.

Link questions are matched against the Links sheet in code (no AI). Other
questions go down a chain of models; if none answers, we fall back to matching.
"""
import re
import time
from collections import defaultdict
from typing import Callable, List, Optional

import httpx

from config import get_settings
from services.sheets import get_all_rows, get_all_announcements, get_qa

settings = get_settings()

STOP = set(
    "a an the is are was am be do does did i me my we our you your to for of in on at and or it this "
    "that there here can could would should please how what where when which who whats link links "
    "form page get find need want have about with cci ajah church".split()
)
NOT_SURE = "I'm not sure about that one. Please ask at the info desk."
SYSTEM = (
    "You are Ezra, the friendly helper for the CCI Ajah church info desk. Answer only from the "
    "INFORMATION below, in at most three short sentences. If the answer is not there, say you are "
    "not sure and suggest asking the info desk. Never write a web address. If one of the LINKS "
    "would help, mention its exact name. Politely decline anything that is not about CCI Ajah."
)

# Per-visitor cap on model calls; over it we still answer by matching.
# shortcut: in-memory, resets when the server restarts; move to a store if abuse shows up.
AI_CALLS = defaultdict(list)
AI_MAX_PER_HOUR = 30

_cache = {"at": 0.0, "data": None}


def _words(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _same(a: str, b: str) -> bool:
    """give ~ giving, member ~ membership, class ~ classes."""
    short = min(len(a), len(b))
    n = max(3, short - 1)
    # 3-letter words only match near-twins (map ~ maps), so "pre" doesn't match "president"
    return a[:n] == b[:n] and (short >= 4 or abs(len(a) - len(b)) <= 1)


def _score(keys: List[str], text: str) -> float:
    """Share of the question's keywords found in text."""
    words = _words(text)
    return sum(any(_same(k, w) for w in words) for k in keys) / len(keys) if keys else 0.0


def _card(link: dict) -> dict:
    return {"id": link["id"], "name": link["name"], "url": link["url"]}


def reply(question: str, links: List[dict], announcements: List[dict], qa: List[dict],
          ask: Optional[Callable[[str, str], Optional[str]]] = None) -> dict:
    """Pure answer logic. `ask(system, question)` calls the models, or is None to skip them."""
    keys = [w for w in _words(question) if w not in STOP and len(w) > 2]
    scored = sorted(((_score(keys, f"{l['name']} {l['cat']} {l['desc']}"), l) for l in links),
                    key=lambda p: -p[0])
    link_best = scored[0][0] if scored else 0.0
    top_links = [_card(l) for s, l in scored[:3] if s == link_best and s > 0]
    qa_best, qa_row = max(((_score(keys, r["question"]), r) for r in qa),
                          key=lambda p: p[0], default=(0.0, None))

    if link_best >= 0.6 and link_best > qa_best:
        return {"answer": "Here you go:", "links": top_links}

    if ask:
        info = "\n".join(
            [f"Q: {r['question']}\nA: {r['answer']}" for r in qa]
            + [f"ANNOUNCEMENT: {a['title']}: {a['message']}" for a in announcements]
            + ["LINKS:"] + [f"- {l['name']}: {l['desc']}" for l in links]
        )
        text = ask(f"{SYSTEM}\n\nINFORMATION\n{info}", question)
        if text:
            named = [_card(l) for l in links if l["name"].lower() in text.lower()]
            return {"answer": text, "links": named[:3]}

    if qa_best >= 0.6:
        return {"answer": qa_row["answer"], "links": top_links if link_best >= 0.6 else []}
    if top_links:
        return {"answer": "I'm not certain, but these might help:", "links": top_links}
    return {"answer": NOT_SURE, "links": []}


def _providers() -> list:
    s = settings
    chain = [
        ("https://api.groq.com/openai/v1/chat/completions", s.groq_api_key, s.groq_model),
        (f"https://api.cloudflare.com/client/v4/accounts/{s.cloudflare_account_id}/ai/v1/chat/completions",
         s.cloudflare_api_token, s.cloudflare_model),
        ("https://openrouter.ai/api/v1/chat/completions", s.openrouter_api_key, s.openrouter_model),
    ]
    return [p for p in chain if p[1]]


def _ask_models(system: str, question: str) -> Optional[str]:
    """Try each provider in order; the first non-empty answer wins."""
    for url, key, model in _providers():
        try:
            r = httpx.post(
                url,
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": model,
                    "messages": [{"role": "system", "content": system},
                                 {"role": "user", "content": question}],
                    "max_tokens": 600,
                    "temperature": 0.2,
                },
                timeout=20,
            )
            r.raise_for_status()
            text = (r.json()["choices"][0]["message"]["content"] or "").strip()
            if text:
                return text
        except Exception:
            continue  # out of quota or down: try the next one
    return None


def _knowledge():
    """Sheet data, cached for 5 minutes so chats don't hit Google on every message."""
    if time.time() - _cache["at"] > 300:
        _cache.update(at=time.time(), data=(get_all_rows(), get_all_announcements(), get_qa()))
    return _cache["data"]


def answer(question: str, ip: str) -> dict:
    links, announcements, qa = _knowledge()
    now = time.time()
    if len(AI_CALLS) > 10000:  # don't let old addresses pile up forever
        AI_CALLS.clear()
    AI_CALLS[ip] = [t for t in AI_CALLS[ip] if now - t < 3600]
    use_ai = bool(_providers()) and len(AI_CALLS[ip]) < AI_MAX_PER_HOUR
    if use_ai:
        AI_CALLS[ip].append(now)
    return reply(question, links, announcements, qa, _ask_models if use_ai else None)


if __name__ == "__main__":
    # Self-check: python -m services.ezra
    L = [
        {"id": "1", "name": "Membership Class", "cat": "membership", "desc": "Sign up for membership class", "url": "u1"},
        {"id": "2", "name": "Book Sales", "cat": "books", "desc": "Browse and order books", "url": "u2"},
    ]
    Q = [{"question": "What time is Sunday service?", "answer": "8:00 am and 10:30 am."}]
    r = reply("where is the link for membership class", L, [], Q)
    assert [l["id"] for l in r["links"]] == ["1"], r
    assert reply("how do I become a member?", L, [], Q)["links"][0]["id"] == "1"
    assert reply("what time is service on sunday", L, [], Q)["answer"] == "8:00 am and 10:30 am."
    assert reply("who won the match", L, [], Q) == {"answer": NOT_SURE, "links": []}
    assert _same("map", "maps") and _same("give", "giving") and not _same("pre", "president")
    r = reply("where do I order books?", L, [], Q, ask=lambda s, q: "Try Book Sales.")
    assert r["answer"] == "Here you go:", r  # strong link match never reaches the model
    r = reply("tell me about the pastor", L, [], Q, ask=lambda s, q: "See Book Sales for his books.")
    assert r["links"][0]["id"] == "2" and "url" in r["links"][0], r
    assert reply("tell me about the pastor", L, [], Q, ask=lambda s, q: None)["answer"] == NOT_SURE
    print("ezra self-check ok")
