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

    subgraph "Backend (NestJS on Vercel)"
        API["API Gateway<br/><i>/api/v1/</i>"]
        AuthGuard["Auth Guard<br/><i>JWKS RS256 + AAL2</i>"]
        Modules["NestJS Modules<br/><i>Grants · Subjects<br/>Newsletter · VAT</i>"]
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
        PkgDB["@bandinet/db<br/><i>Drizzle schema</i>"]
        PkgValidators["@bandinet/validators<br/><i>Zod schemas</i>"]
        PkgShared["@bandinet/shared<br/><i>Types · Enums</i>"]
    end

    %% Auth: Website handles all auth, calls Supabase directly
    WebAuth -->|"login / register / MFA"| SupaAuth
    Publicator -->|"login / MFA"| SupaAuth

    %% Data: frontends send JWT to Backend
    Publicator -->|"JWT"| API
    Matchator -->|"JWT"| API
    Studio -->|"JWT"| API

    %% External webhooks
    BOH -->|"webhook"| API
    Stripe -->|"webhook"| API

    %% Backend internals
    API --> AuthGuard
    AuthGuard -.->|"JWKS verify"| SupaAuth
    AuthGuard --> Modules
    Modules -->|"enqueue"| SupaQueue
    Cron -->|"trigger"| Queue
    Queue -->|"read/pop"| SupaQueue
    Queue -->|"dispatch"| EmailProvider

    %% Backend → Engines (future)
    Modules -.->|"triggers"| Extractor
    Modules -.->|"triggers"| Matching

    %% Backend → Supabase
    Modules -->|"Drizzle"| SupaDB
    Extractor -.->|"Drizzle"| SupaDB
    Extractor -.->|"read docs"| SupaStorage
    Matching -.->|"Drizzle"| SupaDB

    %% Package dependencies
    PkgDB -->|"backend only"| Modules
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
- **Orange** — Backend (NestJS on Vercel)
- **Red** — Vercel Cron (scheduled queue-consumer trigger)
- **Purple** — Shared packages
- **Gray** — External services
- **Dashed gray** — Engines (out of scope — Extractor & Matching)

**Key flows:**

- Auth (login/register/MFA) → **Website** handles all auth flows, calls **Supabase Auth directly**
- Matchator and Studio are route-group layouts under the same Next.js app, sharing auth
- Data operations → frontends send JWT to **Backend API**, backend validates via JWKS
- BOH → Backend webhook → Supabase Queue (pgmq) → Extractor → DB
- Extractor and Matching Engine are **out of scope** — shown as future integrations triggered by Backend
