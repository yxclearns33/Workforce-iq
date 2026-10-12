# Development history

This branch starts from former WorkForce IQ commit 83b2e18. It preserves the supplied-source baseline and actual earlier enhancement commits. New commits are attributed to Codex and record assistance transparently. They do not recreate an imagined student development history.

For a fresh checkout from the package:

    git clone workforce-iq-history.bundle reviewed-source
    cd reviewed-source
    git switch feature/proposal-workforce
    npm ci
    npm run dev

For your existing GitHub clone, preserve its .git directory. Create your own feature branch, review the new source and apply changes including deletions. If it shares the base commit, fetch the bundle and review/cherry-pick the feature commits. Otherwise inspect the supplied changes patch; do not overwrite unrelated work or transplant history blindly.

Record subsequent work as you do it. Keep observed screenshots and exports tied to actual app versions, dataset labels and test IDs. No GitHub remote was provided, so this build has not been pushed.
