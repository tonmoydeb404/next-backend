# BandiNet — System Diagram

```mermaid
graph TB
    subgraph External
        BOH["BOH<br/>(third-party)"]
        Stripe["Stripe"]
        EmailProvider["Email Provider<br/>(TBD)"]
    end

    subgraph "Frontend Apps"
        Publicator["Publicator<br/><i>Next.js</i><br/>Admin Dashboard"]
        subgraph "Website (Next.js)"
            WebAuth["Auth Pages<br/><i>login · register · MFA</i>"]
            Matchator["(matchator)<br/><i>Customer layout</i>"]
            Studio["(studio)<br/><i>Tenant layout</i>"]
        end
    end

    subgraph "Publicator API (Next.js Route Handlers, on Vercel)"
        API["API<br/><i>/backend/api/v1/</i>"]
        AuthGuard["withAuth()<br/><i>JWKS RS256 + AAL2</i>"]
        Modules["Route Handlers<br/><i>Grants · Subjects<br/>Newsletter · VAT</i>"]
        Queue["Queue Consumer<br/><i>reads pgmq batch</i>"]
    end

    subgraph "Engines (out of scope)"
        Extractor["Extractor<br/><i>AI Pipeline</i>"]
        Matching["Matching Engine<br/><i>Subject ↔ Grant scoring</i>"]
    end

    subgraph Infrastructure
        Cron["Vercel Cron<br/><i>scheduled trigger</i>"]
        subgraph "Supabase"
            SupaAuth["Auth<br/><i>email/password + TOTP MFA</i>"]
            SupaDB[("PostgreSQL<br/><i>RLS enabled</i>")]
            SupaStorage["Storage<br/><i>Signed URLs</i>"]
            SupaQueue["Queues<br/><i>pgmq</i>"]
        end
    end

    subgraph "Shared Packages"
        PkgDB["@repo/db<br/><i>Drizzle schema</i>"]
        PkgValidators["@repo/validators<br/><i>Zod schemas</i>"]
        PkgShared["@repo/shared<br/><i>Types · Enums</i>"]
    end

    %% Auth: Website handles all auth, calls Supabase directly
    WebAuth -->|"login / register / MFA"| SupaAuth
    Publicator -->|"login / MFA"| SupaAuth

    %% Data: frontends send JWT to Publicator API
    Publicator -->|"JWT"| API
    Matchator -->|"JWT"| API
    Studio -->|"JWT"| API

    %% External webhooks
    BOH -->|"webhook"| API
    Stripe -->|"webhook"| API

    %% Publicator API internals
    API --> AuthGuard
    AuthGuard -.->|"JWKS verify"| SupaAuth
    AuthGuard --> Modules
    Modules -->|"enqueue"| SupaQueue
    Cron -->|"trigger"| Queue
    Queue -->|"read/pop"| SupaQueue
    Queue -->|"dispatch"| EmailProvider

    %% Publicator API → Engines (future)
    Modules -.->|"triggers"| Extractor
    Modules -.->|"triggers"| Matching

    %% Publicator API → Supabase
    Modules -->|"Drizzle"| SupaDB
    Extractor -.->|"Drizzle"| SupaDB
    Extractor -.->|"read docs"| SupaStorage
    Matching -.->|"Drizzle"| SupaDB

    %% Package dependencies
    PkgDB -->|"publicator only"| Modules
    PkgValidators -.-> Publicator
    PkgValidators -.-> Matchator
    PkgValidators -.-> Modules
    PkgShared -.-> Publicator
    PkgShared -.-> Matchator
    PkgShared -.-> Modules

    style Publicator fill:#4a90d9,color:#fff
    style WebAuth fill:#50b86c,color:#fff
    style Matchator fill:#50b86c,color:#fff
    style Studio fill:#50b86c,color:#fff
    style API fill:#e8833a,color:#fff
    style AuthGuard fill:#e8833a,color:#fff
    style Modules fill:#e8833a,color:#fff
    style Extractor fill:#e8833a,color:#fff
    style Queue fill:#e8833a,color:#fff
    style Extractor fill:#999,color:#fff,stroke-dasharray: 5 5
    style Matching fill:#999,color:#fff,stroke-dasharray: 5 5
    style Cron fill:#d94452,color:#fff
    style SupaAuth fill:#3ecf8e,color:#fff
    style SupaDB fill:#3ecf8e,color:#fff
    style SupaStorage fill:#3ecf8e,color:#fff
    style SupaQueue fill:#3ecf8e,color:#fff
    style BOH fill:#888,color:#fff
    style Stripe fill:#888,color:#fff
    style EmailProvider fill:#888,color:#fff
    style PkgDB fill:#8b5cf6,color:#fff
    style PkgValidators fill:#8b5cf6,color:#fff
    style PkgShared fill:#8b5cf6,color:#fff
```

**Legend:**

- **Blue** — Publicator (admin dashboard)
- **Green** — Website (Next.js) — auth pages + Matchator/Studio route groups
- **Orange** — Publicator API (Next.js Route Handlers, on Vercel)
- **Red** — Vercel Cron (scheduled queue-consumer trigger)
- **Purple** — Shared packages
- **Gray** — External services
- **Dashed gray** — Engines (out of scope — Extractor & Matching)

**Key flows:**

- Auth (login/register/MFA) → **Website** handles all auth flows, calls **Supabase Auth directly**
- Matchator and Studio are route-group layouts under the same Next.js app, sharing auth
- Data operations → frontends send JWT to **Publicator API**, it validates via JWKS
- BOH → Publicator webhook → Supabase Queue (pgmq) → Extractor → DB
- Extractor and Matching Engine are **out of scope** — shown as future integrations triggered by the Publicator API
