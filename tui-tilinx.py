"""
tilinx_client.py — TilinX Terminal (consola).
Chat directo con el agente tilinx-ai (modelo oc/big-pickle por defecto).

Uso:
  python tilinx_client.py                  -> modo interactivo
  python tilinx_client.py "pregunta"       -> una sola consulta

Comandos en modo interactivo:
  /modelo <id>   cambiar modelo (auto, oc-big-pickle/big-pickle, groq/..., ...)
  /historial     ver historial
  /limpiar       limpiar historial
  /status        ver modelos del agente
  exit | salir   cerrar
"""
import json
import os
import sys
import threading
import queue
import urllib.request
import urllib.error

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):
    pass

THEMES = {
    'ciano': {'prompt': '\x1b[36m', 'ok': '\x1b[32m', 'err': '\x1b[31m', 'dim': '\x1b[2m', 'r': '\x1b[0m'},
    'violeta': {'prompt': '\x1b[35m', 'ok': '\x1b[38;5;213m', 'err': '\x1b[31m', 'dim': '\x1b[2m', 'r': '\x1b[0m'},
    'oro': {'prompt': '\x1b[33m', 'ok': '\x1b[38;5;214m', 'err': '\x1b[31m', 'dim': '\x1b[2m', 'r': '\x1b[0m'},
    'verde': {'prompt': '\x1b[32m', 'ok': '\x1b[38;5;114m', 'err': '\x1b[31m', 'dim': '\x1b[2m', 'r': '\x1b[0m'},
}
_THEME = 'ciano'

_tasks = {}  # id -> {'prompt','model','status','result'}
_tq = queue.Queue()
_WORKERS = 2

def _worker():
    while True:
        tid = _tq.get()
        job = _tasks.get(tid)
        if not job:
            _tq.task_done()
            continue
        job['status'] = 'running'
        try:
            job['result'] = ask(job['history'], job['model'])
            job['status'] = 'done'
        except Exception as e:
            job['result'] = f'Error: {e}'
            job['status'] = 'error'
        _tq.task_done()

for _ in range(_WORKERS):
    threading.Thread(target=_worker, daemon=True).start()

AI_URL = os.environ.get("TILINX_AI_URL", "http://127.0.0.1:8088/v1/chat/completions")
AI_KEY = os.environ.get("TILINX_AI_SECRET", "tilinx-ai-secret-2026")
DEFAULT_MODEL = "oc-big-pickle/big-pickle"
SYSTEM = "Eres la terminal del ecosistema TilinX. Responde corto, directo, en el idioma del usuario."


def ask(messages, model):
    body = json.dumps({
        "model": model,
        "messages": [{"role": "system", "content": SYSTEM}] + messages,
        "max_tokens": 400,
    }).encode("utf-8")
    req = urllib.request.Request(AI_URL, data=body, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {AI_KEY}",
    }, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            data = json.loads(e.read().decode("utf-8"))
        except Exception:
            data = {"error": f"HTTP {e.code}"}
        err = data.get("error", f"HTTP {e.code}")
        if isinstance(err, str):
            attempts = data.get("attempts")
            extra = f" (intentos: {', '.join(a['providerId'] for a in attempts)})" if attempts else ""
            return f"✗ {err}{extra}"
        return f"✗ {json.dumps(err)[:300]}"
    except Exception as e:
        return f"✗ {e}"
    txt = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
    return txt or "(respuesta vacía)"


def list_models():
    try:
        url = AI_URL.rsplit("/", 1)[0] + "/models"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {AI_KEY}"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        ids = [m["id"] for m in data.get("data", [])]
        return "modelos:\n  " + "\n  ".join(ids[:24])
    except Exception as e:
        return f"✗ no se pudo listar modelos: {e}"


def _t(color_key, text):
    th = THEMES[_THEME]
    return f"{th.get(color_key,'')}{text}{th['r']}"


def main():
    if len(sys.argv) > 1:
        print(ask([{"role": "user", "content": " ".join(sys.argv[1:])}], DEFAULT_MODEL))
        return

    os.system("")  # activa ANSI/VT en consola de Windows
    model = DEFAULT_MODEL
    history = []
    print(_t("prompt", "TilinX Terminal") + " — oc/big-pickle via tilinx-ai")
    print(f"tema: {_THEME} | /tema cambia · /agente crea tareas paralelas · exit cierra\n")
    while True:
        try:
            line = input(_t("prompt", f"tilinx:{model.split('/')[-1]}") + "> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nadios 👋")
            break
        if not line:
            continue
        low = line.lower()
        if low in ("exit", "salir", "quit"):
            print("adios 👋")
            break
        if low == "/limpiar":
            history.clear()
            print("historial limpio")
            continue
        if low == "/historial":
            for h in history[-10:]:
                print(f"  [{h['role']}] {h['content'][:120]}")
            continue
        if low == "/status":
            print(list_models())
            continue
        if low.startswith("/modelo"):
            parts = line.split(None, 1)
            if len(parts) < 2:
                print("uso: /modelo <id>")
                continue
            model = parts[1].strip()
            print(f"modelo -> {model}")
            continue
        if low.startswith("/tema"):
            parts = line.split(None, 1)
            if len(parts) < 2 or parts[1].strip() not in THEMES:
                print("temas: " + ", ".join(THEMES))
                continue
            globals()["_THEME"] = parts[1].strip()
            print(f"tema -> {parts[1].strip()}")
            continue
        if low.startswith("/agente"):
            parts = line.split(None, 2)
            if len(parts) < 3:
                print("uso: /agente <descripcion> <prompt>")
                print("     /agentes        | estado de tareas paralelas")
                continue
            tid = f"T{len(_tasks)+1}"
            _tasks[tid] = {"prompt": parts[2], "model": model, "status": "queued",
                           "history": [{"role": "user", "content": parts[2]}]}
            _tq.put(tid)
            print(f"> {tid} encolada (desc: {parts[1]}) — workers: {_WORKERS}")
            continue
        if low == "/agentes":
            if not _tasks:
                print("sin tareas")
                continue
            for tid, j in _tasks.items():
                print(f"  {tid} [{j['status']}] {j['prompt'][:60]}")
                if j["status"] in ("done", "error"):
                    print(f"      -> {str(j['result'])[:140]}")
            continue
        if low.startswith("/"):
            print("comandos: /modelo /agente /agentes /tema /historial /limpiar /status, exit")
            continue
        history.append({"role": "user", "content": line})
        print(ask(history, model))
        history.append({"role": "assistant", "content": "(respuesta anterior)"})


if __name__ == "__main__":
    main()