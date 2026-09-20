# @tilinx-ai/board

Kanban board for AI agent task management. Cards glow with a rotating conic-gradient border when agents are running.

## Install

```bash
pnpm add @tilinx-ai/board
```

## Usage

```tsx
import { KanbanBoard } from "@tilinx-ai/board"
import "@tilinx-ai/board/src/styles.css"

const columns = [
  { id: "todo",    label: "To Do",   statuses: ["todo"] },
  {
    id: "running",
    label: "Running",
    statuses: ["running"],
    onAdd: openNewTask,
    addLabel: "New task",
  },
  { id: "done",    label: "Done",    statuses: ["completed"] },
]

<KanbanBoard
  columns={columns}
  items={tasks}
  onSelect={(item) => openDetail(item.id)}
  onApprove={(item) => approve(item.id)}
  runningStatuses={["running"]}
/>
```

## Exports

- `KanbanBoard` -- renders columns from a `columns` config and `items` array
- `KanbanColumn` -- single column with header and card list
- `KanbanCard` -- individual card with glow, delete, approve actions
- `KanbanDetailPanel` -- slide-in detail view for selected items
- `KanbanPeople` -- overlapping avatar face stack (up to `max` faces + a "+N" chip, initials fallback); rendered on cards and the detail panel from `KanbanItem.people`
- Types: `KanbanItem`, `KanbanColumn` (config), `KanbanPerson` (`{ id, label, imageUrl? }`)

`KanbanItem.people?: KanbanPerson[]` supplies the face stack. `KanbanPerson` is store-agnostic -- the consumer maps its own user / attribution model into it (in TilinX, per-mission Teams attribution). Labels are English defaults; pass `label` in for i18n. Pure helpers `visiblePeople` / `overflowCount` / `initialsFor` are exported too.

Columns with `onAdd` render a visible plus button under the last card.

## The Glow

Cards matching `runningStatuses` get the `card-running-glow` CSS class: a `conic-gradient` border animated with `@property --glow-angle`, spinning at 2.5s. Blue, indigo, orange, gold. Pure CSS, no JS animation loop.

## Peer Dependencies

- React 19+
- @tilinx-ai/core

---

Part of [TilinX](../../README.md).
