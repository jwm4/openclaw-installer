# Architecture Decision Records

This directory contains architecture decision records for `openclaw-installer`.

## Index

| ADR | Status | Title | Summary |
| --- | --- | --- | --- |
| [0001](./0001-deployer-plugin-system.md) | Accepted | Deployer Plugin System | Adds the core/provider deployer plugin architecture and runtime plugin loading model. |
| [0002](./0002-agent-security-surface.md) | Proposed | Agent Security Surface | Establishes `Agent Security` as the installer UX surface for SecretRefs now and future hardening later. |
| [0004](./0004-auto-k8s-instance-discovery.md) | Proposed | Automatic K8s Instance Discovery | Removes the manual "Include K8s" toggle; auto-includes cluster instances when k8sAvailable is true. |
