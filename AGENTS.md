# AGENTS.md — Pro Git Workflow

This file defines the disciplined git workflow that AI agents **must** follow when making changes in this repository.

---

## 1. Branch Conventions

- **Prefix all branches** with a category: `feature/`, `fix/`, `chore/`.
- Always branch off `main`.
- Delete the feature branch after merge (both remote and local).
- Branch names should be kebab-case and descriptive:
  - `feature/add-login-page`
  - `fix/header-overflow`
  - `chore/upgrade-deps`

---

## 2. Commit Convention

Use **semantic commits** with emojis. Every commit must follow this format:

```
<emoji> <type>[(<scope>)]: <short description>

[optional body — explain *why* not *what*]
```

| Emoji | Type     | Usage                                   |
| ----- | -------- | --------------------------------------- |
| ✨    | feat     | A new feature                           |
| 🐛    | fix      | A bug fix                               |
| ♻️    | refactor | Code change that neither fixes nor adds |
| 📚    | docs     | Documentation only                      |
| 🧪    | test     | Adding or fixing tests                  |
| 🔧    | chore    | Tooling, config, deps                   |
| 💄    | style    | Formatting, missing semicolons          |
| ⚡    | perf     | Performance improvements                |

**Rules:**

- Subject line ≤ 72 characters.
- Imperative mood ("Add login" not "Added login" or "Adds login").
- Body explains the _motivation_ behind the change, not the code itself.

---

## 3. Pre-commit Workflow

Before every commit, agents **must** run these checks **and block the commit if either fails**:

1. **Lint**: `npm run lint` (or equivalent) — must pass with zero errors.
2. **Test**: `npm run test` (or equivalent) — must pass with zero failures.

If a check fails, the agent must:

1. Report the failure to the user.
2. Fix the issue.
3. Re-run checks.
4. Only then proceed with the commit.

---

## 4. Workflow State Management

- Always be aware of the **current branch** before making changes.
- If switching branches with uncommitted work, **stash** first.
- Do not leave uncommitted changes behind when switching tasks.
- Prefer `git stash` over force-stashing or `--hard` resets.

---

## 5. Commit Strategy

- **Always commit after every edit or change** — no uncommitted work at the end of any task.
- Make **small, atomic commits** — one logical change per commit.
- Group related changes together; avoid "and also" commits.
- Each commit should build on the previous one and keep the project in a working state.

---

## 6. Merge Strategy

- Use **merge commits** (not squash or rebase) to bring feature branches into `main`.
- Keep `main` stable — never force-push to `main`.
- Before merging, ensure:
  - Branch is up-to-date with `main`.
  - All CI checks pass.
  - The feature branch has been reviewed (if applicable).

---

## 7. Pull Request Process

When creating a PR via `gh`:

- Title must match the first commit message.
- Description must include:
  - **What** this PR does.
  - **Why** it's needed (link to issue if applicable).
  - **How** it was tested.
- Add labels matching the commit type (`feat`, `fix`, `chore`, etc.).
- Request review from relevant team members.

---

## 8. Quality Gates

Agents must never:

- Commit secrets, keys, or credentials.
- Leave `console.log`, `debugger`, or TODO stubs in committed code.
- Commit commented-out code blocks.
- Bypass the linter or test suite.
