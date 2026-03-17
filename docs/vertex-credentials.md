# Vertex AI Credential Resolution

This installer supports Google Vertex AI for Gemini models using GCP credentials. This document explains how project ID, location, and credentials are resolved.

## Resolution order

At each layer, the first non-empty value wins.

### Layer 1: User input

Values entered directly in the deploy form take precedence:

- `GCP Project ID`
- `GCP Region`
- `Google Cloud Credentials (JSON)`

### Layer 2: Saved instance config

When you load a saved config, its values populate the form. Later edits in the form still win.

### Layer 3: Environment detection

When Vertex is first enabled, the installer fetches detected defaults from `GET /api/configs/gcp-defaults`. These only fill empty fields.

#### GCP Project ID

Checked in this order:

1. `GOOGLE_CLOUD_PROJECT`
2. `GCLOUD_PROJECT`
3. `CLOUD_SDK_PROJECT`
4. `GOOGLE_VERTEX_PROJECT`
5. `project_id` from the credentials JSON

#### GCP Location

Checked in this order:

1. `GOOGLE_CLOUD_LOCATION`
2. `GOOGLE_VERTEX_LOCATION`

If no location is found, the installer defaults to `us-central1`.

#### Credentials file

Checked in this order:

1. path in `GOOGLE_APPLICATION_CREDENTIALS`
2. `~/.config/gcloud/application_default_credentials.json`
3. `/tmp/gcp-adc/application_default_credentials.json`

The installer validates that the file exists and contains valid JSON before using it.

## Credential types

The credentials JSON file has a `type` field:

| Type | Created by | Works with |
|------|------------|------------|
| `service_account` | Downloading a key from GCP Console or `gcloud iam service-accounts keys create` | Google Vertex Gemini |
| `authorized_user` | `gcloud auth application-default login` | Depends on your local ADC setup; service accounts are the safer default for deploys |

## LiteLLM proxy

When Vertex AI is enabled with service account credentials, the installer can deploy a LiteLLM proxy sidecar alongside the OpenClaw gateway.

### Security benefit

Without LiteLLM, GCP credentials are mounted directly into the gateway container. With LiteLLM, the credentials stay in a separate sidecar and the gateway only gets an internal API key for local proxy access.

### How it works

- Kubernetes: LiteLLM runs as a sidecar container in the same pod
- Local (podman): a pod is created with both containers sharing localhost
- Local (docker): LiteLLM starts first and the gateway joins its network namespace

The gateway connects to `http://localhost:4000/v1` using an internal API key, and LiteLLM forwards requests to Vertex AI.

## Troubleshooting

**Wrong project ID being used?**
Check `GOOGLE_CLOUD_PROJECT`, `GCLOUD_PROJECT`, `CLOUD_SDK_PROJECT`, and `GOOGLE_VERTEX_PROJECT`. The first one found wins unless you override it in the form.

**Credentials not detected in the UI?**
If running the installer in a container, make sure `run.sh` is forwarding your environment and mounted credential files correctly.

**LiteLLM proxy not starting?**
Check the sidecar logs:

- local: `podman logs <name>-litellm` or `docker logs <name>-litellm`
- Kubernetes: `kubectl logs -n <namespace> deployment/openclaw -c litellm`

**First deployment is slow?**
The LiteLLM image is large. Pre-pull it if needed:

```bash
podman pull ghcr.io/berriai/litellm:main-latest
```
