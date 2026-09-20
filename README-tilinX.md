# TilinX Agent — README raíz (rebrand completo)

**Houston → TilinX.** Este es un fork open-source del agente de escritorio
(Houston), con marca **tilinX** en todo el código, iconos, configs y binarios,
motor **tilinx-ai** (modelo `oc/big-pickle`) y funciones estilo **opencode**
(TUI, temas, servidor para otro dispositivo, agentes por tarea).

## Rebranding aplicado
- `Houston/houston/HOUSTON` → `TilinX/tilinx/TILINX` en ~5.000 archivos.
- Carpetas `houston*/` → `tilinx*` (59 dirs).
- `com.houston.app` → `com.tilinx.agent`; iconos nuevos `tilinx-*.svg`.
- PDFs de guías conservan marca vieja adentro (binarios, no editables aquí).

## Inicio en terminal con la palabra "tilinXagent"
```
C:\TILINX\bin\tilinXagent.exe        # la app de escritorio (engine)
tilinXagent                          # si está en PATH (ver bin/)
```
Modo TUI (chat en terminal con tilinx-ai / oc/big-pickle):
```
python tui-tilinx.py                 # REPL con /modelo /agente /status
```

## Agentes
- `agents/tilinx-ai.md` — agente principal (idéntico al de opencode).
- Cada `agents/*.md` = un agente desplegable por tarea (multiagente paralelo,
  ver `tilinx.toml` → `agents.max_parallel_tasks`).

## Servidor para otro dispositivo (estilo `opencode serve`)
```
[server] en tilinx.toml: enabled=true, port=2099
```
Público: tunél Cloudflare `cloudflared tunnel --url http://127.0.0.1:2099`.

## Temas
`theme` en tilinx.toml acepta `opencode-dark`, `opencode-light`, o `custom`
con `accent` propio.

## Build (desde el código fuente)
```
cd C:\TILINX\tilinX-agent-src
pnpm install          # (ya existe node_modules en la copia original)
pnpm build            # UI
cd crates/app && cargo build --release   # engine Rust
app\src-tauri\cargo tauri build          # app desktop (Windows)
```
El binario final se llama `tilinx-engine.exe` (antes houston-engine).

## Extraído además
- `opencode-dev/` y el fork de memoria (`TencentDB-Agent-Memory...`) quedan en
  `C:\Users\Chichi\AppData\Local\Temp\opencode\rebrand\` para referencia:
  sus TUI/temas/servidor son la base de los apartados añadidos.

## Licencia
MIT — fork del stack Houston (ver LICENSE del repo).