# ADR 0004: Automatic K8s Instance Discovery

## Status

Proposed

## Context

The Instances tab in the installer UI has an "Include K8s" toggle that defaults to `false`. When a user deploys an agent to Kubernetes or OpenShift, the deployed instance does not appear in the Instances tab until the user manually clicks this toggle. The toggle state is not persisted across page reloads.

This creates a confusing user experience: a deployment succeeds, but the instance appears to be missing. Users must know to click the toggle — a discovery problem that is especially acute for new users.

### History

The toggle was part of the original code imported from the upstream `claw-installer` repository. It was never introduced via a reviewed PR, so there is no recorded design rationale. Commit `652d9d1` (deployer plugin system) fixed the default to `true`, but commit `e9771ce` (bulk sync from upstream) reverted it to `false`.

### Why the toggle existed

The `includeK8s` query parameter on `/api/instances` gates calls to the Kubernetes API (`discoverK8sInstances`). When no cluster is connected, these calls fail or time out, slowing down the instance list. The toggle gave users a way to skip these calls.

However, the `/api/health` endpoint already reports `k8sAvailable`, which indicates whether a cluster is reachable. This makes the manual toggle redundant — the system already knows whether K8s API calls will succeed.

## Decision

Remove the "Include K8s" toggle and auto-include Kubernetes/OpenShift instances whenever the cluster is reachable.

### Behavior

- On mount, the `InstanceList` component fetches `/api/health` to determine `k8sAvailable`.
- If `k8sAvailable` is `true`, all subsequent instance fetches include `?includeK8s=1`.
- If `k8sAvailable` is `false` (no cluster, or health check fails), instance fetches omit the parameter, and no K8s API calls are made server-side.
- There is no manual toggle. The decision is fully automated.

### Edge cases considered

**Slow clusters:** If the cluster is reachable but API calls are slow, the 5-second polling interval means the UI remains responsive — each poll is independent, and slow responses from one poll don't block the next. The server-side `isClusterReachable()` check at `status.ts:202` provides an additional guard.

**Cluster becomes unreachable after health check:** The health check runs once on mount. If the cluster goes down after that, `k8sAvailable` remains `true`, but the server's `isClusterReachable()` call will fail gracefully (the `catch` block at `status.ts:240` ensures local instances are still returned). A page reload re-runs the health check and corrects the state.

**Mixed local + K8s usage:** Both local and K8s instances appear in the same list, differentiated by badges. No filtering is needed — users benefit from seeing all instances in one view.

**No cluster connected:** When `k8sAvailable` is `false`, the behavior is identical to before: only local instances are shown, and no K8s API calls are made.

## Consequences

### Positive

- Deployed K8s/OpenShift instances are immediately visible without manual intervention.
- One less UI control to understand and maintain.
- The performance optimization (skipping K8s API calls when no cluster exists) is preserved automatically.

### Negative

- Users can no longer manually hide K8s instances. If this is needed in the future, it should be implemented as a filter/view option rather than a toggle that gates API calls.
- The first fetch on page load always uses `k8sAvailable = false` (the default before the health check returns), so there is a brief moment where only local instances are shown. This is identical to the previous behavior.
