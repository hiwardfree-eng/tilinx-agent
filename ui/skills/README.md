# @tilinx-ai/skills

Skills management UI backed by TilinX skill files. Browse installed skills, view details, search and install from the community marketplace.

## Install

```bash
pnpm add @tilinx-ai/skills
```

## Usage

```tsx
import { SkillsGrid } from "@tilinx-ai/skills"

<SkillsGrid
  skills={installedSkills}
  loading={false}
  onSkillClick={(skill) => navigate(`/skills/${skill.id}`)}
  onListFromRepo={(source) => listRepoSkills(source)}
  onInstallFromRepo={(source, skills) => installRepoSkills(source, skills)}
/>
```

## Exports

- `SkillsGrid` -- main view with installed skill list + optional community section
- `SkillRow` -- single skill row with name, description, icon
- `SkillDetailPage` -- full detail view for a selected skill
- `AddSkillDialog` -- the Add Skill dialog (GitHub / From scratch tabs)
- `SkillMarketplaceSection` -- inline marketplace section (search + category shelves) for a page
- `SkillMarketplaceGrid` -- the Skills.sh marketplace card grid (search + popular)
- `SkillMarketplaceRow` -- compact marketplace row (AppRow idiom) with info + install actions
- `SkillPreviewModal` -- overlay detail modal for a marketplace skill
- `LearningRow` -- skill learning/memory display
- Types: `Skill`, `CommunitySkill`, `LearningCategory`, `SkillLearning`

## Peer Dependencies

- React 19+
- @tilinx-ai/core

---

Part of [TilinX](../../README.md).
