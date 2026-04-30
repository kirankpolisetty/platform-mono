# Coral Monorepo OpenShift Pipeline

These YAML files create a starter OpenShift Pipeline for the Angular microfrontend monorepo.

Flow:

```text
clone
  -> detect-changes
  -> build-app (fan-out: one task run per changed app)
  -> deploy-app (fan-out: one task run per changed app)
```

Namespace:

```text
kyranpoli-dev
```

## Files

```text
00-git-clone-task.yaml
01-detect-monorepo-changes-task.yaml
02-build-angular-image-task.yaml
03-deploy-openshift-app-task.yaml
04-coral-monorepo-pipeline.yaml
05-pipelinerun-example.yaml
06-buildconfigs.yaml
07-github-push-trigger.yaml
08-azure-devops-push-trigger.yaml
```

## Apply

```bash
oc project kyranpoli-dev

oc apply -f scripts/00-git-clone-task.yaml
oc apply -f scripts/01-detect-monorepo-changes-task.yaml
oc apply -f scripts/02-build-angular-image-task.yaml
oc apply -f scripts/03-deploy-openshift-app-task.yaml
oc apply -f scripts/04-coral-monorepo-pipeline.yaml
```

`scripts/06-buildconfigs.yaml` is now a legacy helper. The pipeline creates the required `ImageStream`, `BuildConfig`, and deployment automatically for each discovered Angular app.

Edit `scripts/05-pipelinerun-example.yaml` and replace:

```text
REPLACE_WITH_YOUR_GIT_REPO_URL
```

Then run:

```bash
oc apply -f scripts/05-pipelinerun-example.yaml
```

## First Run

For the first run, set:

```yaml
- name: force-all
  value: "true"
```

That builds and deploys every Angular application currently declared in `angular.json`.

Today that means:

```text
shell       -> coral-shell image/deployment
coreviewer  -> coreviewer image/deployment
dataviewer  -> dataviewer image/deployment
```

After the first run, set it back to:

```yaml
- name: force-all
  value: "false"
```

## Change Detection Rules

The detect task discovers Angular applications from `angular.json` and builds all of them when common files change:

```text
package.json
package-lock.json
angular.json
Dockerfile
.dockerignore
tsconfig*.json
```

Project-level changes build only the matching app:

```text
projects/<app>/**  -> <app>
```

When you add a new Angular application under `projects/` and register it in `angular.json`, the pipeline picks it up automatically on the next run. It will:

```text
1. include the app in change detection
2. create a separate build task run for that app
3. create a separate deploy task run for that app
4. create or update its ImageStream, BuildConfig, and Deployment
```

## Assumptions To Verify

The pipeline uses these OpenShift names:

```text
shell        -> coral-shell
other apps   -> same as the Angular app name
```

If you need a different naming convention, update the `normalize_name()` function in `scripts/02-build-angular-image-task.yaml`.

The pipeline uses OpenShift `BuildConfig` plus `oc start-build` instead of privileged Buildah. This avoids SCC failures where the `pipeline` service account cannot run privileged containers.

## Git Push Trigger

To run the pipeline automatically from a GitHub push, apply the trigger resources:

```bash
oc apply -f scripts/07-github-push-trigger.yaml
```

Before applying in a real environment, replace this placeholder in `07-github-push-trigger.yaml`:

```text
REPLACE_WITH_WEBHOOK_SECRET
```

Then get the webhook URL:

```bash
oc get route coral-monorepo-webhook -n kyranpoli-dev
```

Use this route host as the GitHub webhook payload URL:

```text
https://<route-host>
```

GitHub webhook settings:

```text
Payload URL: https://<route-host>
Content type: application/json
Secret: same value as coral-github-webhook-secret.secretToken
Events: Just the push event
Active: checked
```

On every push, the trigger creates a new `PipelineRun`.

The push payload sets:

```text
git-url       = repository clone_url
git-revision  = pushed branch name
base-revision = previous commit SHA from body.before
force-all     = false
```

The detect task then compares `base-revision` to `HEAD` and selectively builds only the changed apps.

## Azure DevOps / TFS Git Push Trigger

For Azure DevOps/TFS Git repos, use the Azure-specific trigger instead of the GitHub trigger:

```bash
oc apply -f scripts/08-azure-devops-push-trigger.yaml
```

Get the webhook route:

```bash
oc get route coral-monorepo-azure-webhook -n kyranpoli-dev
```

Use this route host as the Azure DevOps Service Hook URL:

```text
https://<route-host>
```

Azure DevOps Service Hook settings:

```text
Service Hooks -> Create subscription
Service: Web Hooks
Trigger/event: Code pushed
Repository: your monorepo
Branch: main, or the branch you want
URL: https://<route-host>
HTTP method: POST
Resource details to send: All
```

The Azure trigger maps the Azure `git.push` payload to the pipeline params:

```text
git-url       = body.resource.repository.remoteUrl
git-revision  = body.resource.refUpdates[0].name without refs/heads/
base-revision = body.resource.refUpdates[0].oldObjectId
force-all     = false
```

If your Azure repo is private, the clone step must have credentials. The current simple clone task works for public repos or repos where the cluster can clone without authentication. For private Azure Repos, configure either an authenticated HTTPS clone URL, a Git credential secret, or SSH deploy key support before enabling the webhook.
