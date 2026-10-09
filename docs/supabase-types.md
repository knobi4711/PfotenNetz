# Supabase type drift checks

`.github/workflows/supabase-types.yml` compares the checked-in database types
with the remote project's public schema every Monday at 04:17 UTC. It can also
be started manually using GitHub Actions → Supabase type drift → Run workflow.

## Configuration

Set these repository secrets under Settings → Secrets and variables → Actions:

- `SUPABASE_ACCESS_TOKEN`: Supabase access token with access to the target project.
- `SUPABASE_PROJECT_REF`: Reference of the project whose migrations should match
  the checked-in types.

Missing secrets skip scheduled checks with a notice. A manually started workflow
fails at its configuration step until both secrets are present. The workflow
reads the remote schema; it does not apply migrations or modify repository files.

## Comparison and failures

Generation must succeed and produce a nonempty file. Both generated and
checked-in types are formatted with the repository's Prettier configuration
before comparison so whitespace differences alone do not cause drift failures.
The diff appears in the workflow log.

If drift is detected, verify that the intended migrations are deployed to the
configured project, regenerate the types, review the changes and run the
monorepo typecheck before committing them. Do not replace checked-in types with
empty output after a failed generation.

The remote check still requires a successful run with configured credentials;
local formatting validation is not evidence that the schema matches.
