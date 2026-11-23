# Architecture diagrams

These Mermaid diagrams represent the current code. See
[architecture.md](architecture.md) for details and operational limitations.

## Runtime and external systems

```mermaid
flowchart LR
    Visitor[Visitor browser]
    Admin[Administrator browser]
    Stripe[Stripe Checkout]
    Mamo[Mamo Pay API and hosted payment]
    Social[Facebook and Instagram]
    Assets[Google Fonts, Lucide CDN and Unsplash]

    subgraph App["Node.js / Express application"]
        Pages["Storefront / and admin /admin or /allani"]
        API["Public and admin HTTP API"]
        Auth["In-memory sessions and login limits"]
        Files["PostgreSQL documents or local JSON files"]
        Uploads["PostgreSQL or local uploaded images"]
        Share["Social preview /share/:id"]
    end

    Visitor -->|HTML and API requests| Pages
    Pages --> API
    Admin -->|HTML and authenticated API requests| Pages
    API --> Auth
    API --> Files
    API --> Uploads
    Visitor --> Share
    Share --> Files
    Visitor -->|Image requests| Uploads
    API -->|Create and verify checkout| Stripe
    API -->|Create link and verify payment| Mamo
    Stripe -->|Signed webhook, if configured| API
    Visitor -->|Hosted checkout| Stripe
    Visitor -->|Hosted payment| Mamo
    Visitor -->|Embeds and links| Social
    Visitor -->|External UI resources| Assets
```

On the Node server, `/allani` uses the same authenticated APIs as `/admin`.
The generated `front-office/allani/` remains a separate interactive static demo.

## Static generation and publishing

```mermaid
flowchart LR
    Templates["Root storefront and admin HTML"]
    Data["PostgreSQL or local JSON data"]
    Resources["Translations, contact script and logo"]
    Generator["node front-office/sync.js"]
    Storefront["front-office/index.html<br/>Prime Cars showcase"]
    Snapshot["front-office/allani/index.html<br/>Public interactive admin demo"]
    Host["Static host, e.g. Netlify"]
    Browser["Visitor browser"]

    Templates --> Generator
    Data --> Generator
    Resources --> Generator
    Generator --> Storefront
    Generator --> Snapshot
    Storefront --> Host
    Snapshot --> Host
    Host --> Browser
```

Publishing only the generated storefront omits the admin snapshot. Publishing
the entire `front-office` directory includes it. Data changes require
regeneration and redeployment; external assets and any referenced uploaded
images must remain accessible. The static storefront has no deposit checkout.

## Reservation and payment

```mermaid
sequenceDiagram
    actor Customer
    participant Browser
    participant Server as Express server
    participant Data as PostgreSQL or local JSON files
    participant Provider as Stripe or Mamo

    Customer->>Browser: Choose vehicle and enter contact details
    Browser->>Server: POST /api/reserve
    Server->>Data: Check vehicle and create pending hold
    Server->>Provider: Create hosted checkout or payment link
    Provider-->>Server: Provider reference and checkout URL
    Server->>Data: Save provider reference and checkout URL
    Server-->>Browser: Checkout URL
    Browser->>Provider: Redirect to hosted checkout
    Customer->>Provider: Complete payment
    Provider-->>Browser: Return to vehicle page
    Browser->>Server: POST /api/reserve/confirm
    Server->>Provider: Retrieve payment status
    Provider-->>Server: Verified status
    opt Stripe webhook configured
        Provider->>Server: Signed checkout.session.completed webhook
    end
    Note over Server,Data: On verified paid status, match provider reference.
    Server->>Data: Mark reservation paid; reserve available vehicle
    Server-->>Browser: Confirmation result
```

The webhook is an alternative Stripe confirmation path and may arrive before
or after the browser return. Mamo is verified through the return flow. Pending
holds last 30 minutes for the application's blocking check, without
automatically updating the pending record's status.

## Data relationships

```mermaid
erDiagram
    VEHICLE ||--o{ RESERVATION : referenced_by
    VEHICLE ||--o{ APPOINTMENT : referenced_by
    VEHICLE ||--o{ UPLOADED_IMAGE : has
    SOCIAL_CONFIGURATION ||--o{ SOCIAL_POST : contains

    VEHICLE {
        string id
        string name
        string status
        number price
    }
    RESERVATION {
        string id
        string carId
        string provider
        string providerRef
        string status
    }
    APPOINTMENT {
        string id
        string carId
        string date
        string status
    }
    UPLOADED_IMAGE {
        string url
    }
    SOCIAL_POST {
        string platform
        string url
        string embed
    }
```

These are logical references within JSON documents, not database-enforced
foreign keys. Vehicles may also use external image identifiers rather than
uploaded files.
