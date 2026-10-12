# Apply to your existing GitHub repository

No repository URL was supplied and this ZIP contained no previous Git history. The delivered folder has a local Git history and an accompanying bundle for the work done here. Do not claim those are your prior development commits.

In your existing clone, first commit or stash your own pending changes. Create a feature branch. Copy the updated source and documentation into that clone, excluding .git, node_modules, .env.local and dist. Review the changes using git diff, run the checks, then commit and push with your own authenticated account. This preserves the existing repository history.

If you want to retain the exact new Codex commits, fetch the supplied bundle into the existing clone and cherry-pick only the enhancement commits, excluding the unrelated baseline commit. Review conflicts against your actual source. The bundle branch is enhancement/experience-recommendations.

Suggested commands from your existing clone (adjust the bundle path):

    git switch -c enhancement/experience-recommendations
    git fetch /path/to/workforce-iq-history.bundle enhancement/experience-recommendations:incoming-workforce
    git log --oneline incoming-workforce

Select the fix/feature/test/documentation commits shown after the baseline, oldest first. Do not merge unrelated baseline histories blindly. Capture your genuine reviews and subsequent changes in new commits. No force-push or backdating is needed.
