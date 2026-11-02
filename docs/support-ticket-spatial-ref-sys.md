# Support Ticket: RLS disabled on `public.spatial_ref_sys`

**Subject:** Security Advisor 0013: RLS disabled on `public.spatial_ref_sys` (writable via Data API)

**Project:** PfotenNetz
**Project ref:** `njkyujhbcolvtcnlahsk`
**Region:** `eu-west-1`
**Dashboard:** https://supabase.com/dashboard/project/njkyujhbcolvtcnlahsk

---

## Ticket text

Hello Supabase Support,

the Security Advisor reports the following ERROR for our project:

> Table public.spatial_ref_sys is public, but RLS has not been enabled.
> Lint: 0013_rls_disabled_in_public

`public.spatial_ref_sys` belongs to the `postgis` extension, which is installed
in the `public` schema and owned by `supabase_admin`. RLS is disabled and the
Data API roles still have full table privileges, so the EPSG reference rows can
be modified or deleted through the Data API with the public anon key. That can
break `ST_Transform` and other PostGIS functions for all users.

### Verified state

```text
table owner:              supabase_admin
relrowsecurity:           false
ACL:                      anon=arwdDxtm/supabase_admin
                          authenticated=arwdDxtm/supabase_admin
extension:                postgis (schema public, owner supabase_admin,
                          relocatable = false)
current_user (SQL/API):   postgres (not superuser, not a member of supabase_admin)
```

What we already tried as `postgres`:

- `alter table public.spatial_ref_sys enable row level security;` fails with
  `42501: must be owner of table spatial_ref_sys`.
- `revoke insert, update, delete, truncate on public.spatial_ref_sys from anon, authenticated;`
  is a silent no-op, because `supabase_admin` is the grantor.
- `set role supabase_admin` is denied.

### Request

Please run the following statements as `supabase_admin`:

```sql
alter table public.spatial_ref_sys enable row level security;

drop policy if exists spatial_ref_sys_public_read on public.spatial_ref_sys;
create policy spatial_ref_sys_public_read
  on public.spatial_ref_sys
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete, truncate
  on public.spatial_ref_sys
  from anon, authenticated;
```

We deliberately choose the read-only option from the advisor's suggested fixes:

- Every row in `spatial_ref_sys` is public EPSG coordinate-system metadata, so
  `using (true)` is appropriate. The table contains no project or user data.
- PostGIS functions such as `ST_Transform` are `SECURITY INVOKER` and read the
  SRID definitions with the privileges of the calling role. Keeping `SELECT`
  for `anon` and `authenticated` avoids breaking those calls.
- Removing `public` from the exposed schemas is not an option, because our
  entire Data API schema lives in `public`.
- Revoking the grants is not possible for us: `supabase_admin` is the grantor,
  so `REVOKE` as `postgres` is a no-op.

If you prefer the long-term fix, moving the PostGIS extension from `public` to
the `extensions` schema would also clear this finding (and the related
`extension_in_public` warning). Since PostGIS is not relocatable, we cannot do
that ourselves.

Please let us know once the change is applied. We will rerun the Security
Advisor afterwards.

Thank you!
