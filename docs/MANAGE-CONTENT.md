# Manage Content and Source Control

Treat GitHub as the shared source of truth: Pages CMS saves changes there, and your local folder needs to pull them down.

Before starting work locally, run:
```bash
git status
git pull --ff-only
npm run content:build
```

git pull updates your local files. The build regenerates the manifests so new or deleted records appear correctly in Live Server.

After making website changes locally:
1. Review and commit your changes in VS Code.
2. Pull again in case someone edited content while you were working.
3. Push your commits.
4. Run ./deploy.sh if you changed website code or design.

If you have local commits and the pull reports that it cannot fast-forward, use:
```bash
git pull --rebase origin main
```

This reapplies your local commits on top of the latest CMS changes. If it reports conflicts, resolve those before pushing—or paste the output here.

If you have unfinished, uncommitted work and Git refuses to pull:
```bash
git stash push -u -m "Work in progress before CMS sync"
git pull --ff-only
git stash pop
```

Then rebuild the manifests:
```bash
npm run content:build
```

A few useful distinctions:
|Command|What it does|
|-----|-----|
|git fetch|Downloads remote history without changing your working files|
|git pull --ff-only|	Updates your local branch and files when no merge is needed|
|git status|	Shows local changes and branch status|
|npm run content:build|	Regenerates local content manifests|


The easiest routine is to edit gigs and testimonials in Pages CMS, and code in VS Code. Pull before each coding session and before pushing. Your computer does not need to be running for CMS changes to publish.