Review the changes on @branch:

- Think through how data flows in the app. Explain new patterns if they exist and why.
- Were there any changes that could affect infrastructure?
- If public APIs have changed, ensure backwards compat (or increment API version).
- Did we add any unnecessary dependencies? If there's a heavy dependency, could we inline a more minimal version?
- Did we add quality tests? Prefer fewer, high quality tests. Prefer integration tests for user flows.
- Were there schema changes which could require a database migration?
- Changes to auth flows or permissions?
- If feature flags are set up, does this change require adding a new one?
- If 118n is set up, are the strings added localized and new routes internationalized?
- Are there places we should use caching?
- Are we missing critical o11y or logging on backend changes?