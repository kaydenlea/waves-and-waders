# AGENTS.md

## Purpose

This document is the governing instruction set for AI coding agents working in this repository.

Read this file before inspecting or changing code. These rules define the product philosophy, privacy model, engineering standards, security expectations, architecture principles, performance constraints, and long-term design direction for the product.

This repository powers an existing surf forecasting product and is evolving into a broader coastal water intelligence platform for surfers and anglers. All future implementation work must preserve the forecasting foundation while adding structured, privacy-safe, decision-supporting community intelligence.

If code, product ideas, or implementation shortcuts conflict with this document, follow this document.

## Implementation Standards

All future changes must be built using documented, industry-standard practices intended for long-term use.

### Documentation-First Rule

Before implementing or changing behavior, future agents must consult the relevant official documentation whenever applicable.

Examples include:

- Framework and runtime documentation
- Language documentation
- Database documentation
- Cloud or platform documentation
- Security guidance from official vendors or recognized standards bodies
- Library documentation for any dependency being used

Requirements:

- Prefer primary sources over blog posts, forum snippets, or cargo-culted examples.
- Use documented APIs, supported extension points, and recommended patterns.
- Align implementation choices with current official guidance when working in framework, library, platform, security, or infrastructure code.
- If existing code conflicts with official guidance, do not copy the bad pattern forward without a strong reason.

### No Hacks or Fragile Workarounds

Future agents must avoid hacks, brittle workarounds, and undocumented behavior unless there is no viable alternative and the constraint is explicit.

Do not introduce or extend:

- Undocumented internal API usage
- Fragile DOM or implementation-detail coupling
- Monkey patches or behavior overrides without clear necessity
- Temporary fixes presented as permanent architecture
- Silent fallbacks that hide real failures
- Copy-pasted patterns that are not justified by the platform's recommended usage

If a workaround is truly unavoidable:

- Keep it narrowly scoped
- Document why it is necessary
- Prefer the least risky option
- Preserve the ability to remove it later
- Do not normalize it into the default project pattern

### Long-Term Maintainability Standard

All changes should be optimized for long-term usage, not just short-term completion.

Future agents must prefer implementations that are:

- Maintainable
- Testable
- Readable
- Explicit
- Upgrade-friendly
- Secure by design
- Performance-conscious
- Consistent with ecosystem norms

When evaluating multiple valid approaches, prefer the one that is most likely to remain correct, understandable, and supportable over time.

### Industry-Standard Engineering Rule

Only use good coding practices.

In practice, this means:

- Follow official framework and language conventions
- Use clear abstractions rather than clever shortcuts
- Keep responsibilities separated
- Validate assumptions instead of relying on incidental behavior
- Write code that another engineer can safely extend later
- Choose stable patterns over novelty
- Avoid accumulating technical debt for convenience

### Type Safety and Code Quality

Future agents must prefer strong, explicit, maintainable typing and must avoid weakly typed shortcuts.

Requirements:

- Do not introduce `any` unless there is no practical alternative and the reason is documented
- Prefer precise types, interfaces, discriminated unions, and well-scoped generics
- Use `unknown` instead of `any` when input is truly unknown, then narrow it safely
- Model nullable and optional states explicitly rather than relying on implicit assumptions
- Preserve type safety across API boundaries, serializers, database access, and UI state
- Add or improve runtime validation where external or user-controlled data enters the system

Avoid these bad practices unless there is a narrowly justified exception:

- Blanket type assertions used to silence errors
- `@ts-ignore` or equivalent suppression without a documented reason
- Silent swallowing of type mismatches
- Overly broad shared types that hide public/private boundary mistakes
- Loose object shapes where domain structure should be explicit

If a type system warning is inconvenient, fix the underlying design instead of bypassing it.

If a change cannot be defended by maintainability, correctness, security, performance, and documented support, it should be reconsidered.

## Product Hierarchy

The product hierarchy is:

1. Forecast first
2. Community intelligence second
3. Social third

This ordering is non-negotiable.

### What Forecast First Means

- The forecast, map, conditions, charts, and trip-planning experience remain the primary product.
- The system must continue to help users answer practical questions such as:
  - Is it worth going?
  - Where is it likely to work at a coarse decision level?
  - When should I go?
  - What conditions matter today?
- Community features must support the forecasting experience, not compete with it.
- Agents must not introduce features that clutter, delay, or visually overpower the forecast experience.

### What Community Intelligence Second Means

- Community contributions are valuable when they improve decision-making, confidence, and planning.
- Community input should be structured, contextual, and interpretable.
- Reports should become useful signal, not just content.
- Community systems should help users understand observed reality, access constraints, recent changes, and confidence gaps around modeled or forecasted conditions.

### What Social Third Means

- This product must not become a generic social media feed.
- Avoid building engagement loops that optimize for posting volume, vanity metrics, creator behavior, or low-signal scrolling.
- Do not prioritize free-form social features over structured intelligence.
- Social interactions, if present, must remain secondary to utility.

## Product Lessons That Must Shape All Work

The following lessons are foundational and must guide all future design and implementation decisions:

- The product must remain forecast-first.
- Community and crowdsourcing features must not replace or clutter the core forecasting experience.
- The product must not degrade into a generic feed of noisy, low-signal posts.
- Fishing spot burning is a serious trust, privacy, and real-world harm risk.
- Crowd signal is uncertain by default and must be modeled as such.
- Sparse data can mislead users and leak private information through reverse inference.
- Personal logging is core product value, not a secondary use case.
- Signal over noise is a UX principle, not a preference.
- Access and logistics are part of trip viability and belong in the product.
- Security, privacy, abuse prevention, and defensive design are core requirements, not later polish.

## Primary Product Goals

All features should improve one or more of the following:

- Trip planning
- Conditions understanding
- Forecast interpretation
- Confidence calibration
- Personal pattern tracking
- Practical access/logistics awareness

If a feature does not materially improve user decisions, confidence, or private long-term value, it should be deprioritized.

## Core UX Principle: Signal Over Noise

Every future agent must evaluate new features with this question:

Does this help the user make a better decision?

If the answer is no, do not prioritize it.

Implications:

- Prefer structured reports over generic posting.
- Prefer summaries and derived insight over raw feed volume.
- Prefer quality, recency, confidence, and relevance over engagement mechanics.
- Avoid interfaces that encourage low-effort content spam.
- Avoid presenting weak evidence as a strong conclusion.

## Supported Domains: Surf and Fishing

This product serves both surfers and anglers.

Future agents must preserve clear domain boundaries:

- Surf-specific concepts must remain surf-specific.
- Fishing-specific concepts must remain fishing-specific.
- Shared environmental and access intelligence may be shared only when the meaning is clear.

Do not blur these domains in naming, UI, filters, schemas, or APIs.

Examples:

- Surf quality, crowd level, lineup behavior, and swell mismatch are surf-specific.
- Species, catch method, kept/released, and bite activity are fishing-specific.
- Wind, tide, water temperature, clarity, closures, hazards, and parking may be shared conditions or logistics intelligence when modeled clearly.

The product may share infrastructure across surf and fishing, but users must always understand what type of signal they are seeing.

## Community Content Model

Community content in this system is not generic posting. It is structured reporting intended to power insight and planning.

The allowed structured contribution types are:

### 1. Surf Check

Examples of fields:

- Surf quality
- Crowd level
- Observed wind or swell mismatch
- Quick notes
- Optional image
- Linked beach or surf spot when applicable

Purpose:

- Help users compare forecasted versus observed surf reality.
- Improve confidence and trip-planning decisions.
- Capture structured observational surf signal.

### 2. Catch Report

Examples of fields:

- Species
- Optional length
- Optional weight
- Method such as shore, kayak, boat, bait, lure, or fly
- Kept or released
- Optional notes
- Optional image
- Privacy-sensitive location metadata

Purpose:

- Support private logging and pattern learning.
- Provide privacy-safe community signal where allowed.
- Never normalize exact public fishing spot disclosure.

### 3. Conditions Report

Examples of fields:

- Observed water clarity
- Current conditions
- General bite activity
- Surf-related observations
- Other useful trip-planning observations even without a catch or full surf session

Purpose:

- Capture useful real-world conditions even when no session or catch report exists.
- Improve decision-making without forcing users into all-or-nothing reporting.

### 4. Access / Logistics Report

Examples of fields:

- Parking issues
- Closures
- Access restrictions
- Private property constraints
- Hazard warnings
- Beach access changes
- Gate status
- Local conditions affecting whether a trip is viable

Purpose:

- Capture practical trip viability, not just environmental conditions.
- Preserve critical local intelligence that many users care about more than abstract forecasts.

## Conditions-Native Design

All community reports should attach conditions context whenever possible.

Reports should become usable data, not isolated content objects.

Whenever available, structured report records should preserve or derive context such as:

- Timestamp
- Tide
- Swell
- Wind
- Water temperature
- Selected beach, spot, zone, or region
- Forecast snapshot
- Existing conditions data already available in the product

Design rules:

- Prefer storing structured conditions context rather than requiring later guesswork.
- Preserve the distinction between observed values and forecast values.
- Preserve enough context for future analytics, trust scoring, and pattern learning.
- Do not flatten reports into generic text blobs that destroy analytical value.

## Public Intelligence Is Aggregated, Not Raw Social Output

Public intelligence surfaces must favor:

- Aggregated signal
- Trend summaries
- Confidence-aware observations
- Privacy-safe regional insights
- Structured trip-planning relevance

Public surfaces must not optimize for:

- Feed volume
- Real-time exact fishing activity exposure
- Attention capture
- "Who posted the best catch photo"
- Generic social posting behavior

## Location Privacy Model

Exact fishing locations are sensitive.

This is a first-class product rule, not a UI preference.

### Core Rules

- Public features must never expose exact fishing spots by default.
- Exact fishing locations must be treated as sensitive data.
- Location visibility must be designed intentionally in schemas, APIs, queries, caches, exports, analytics, and UI.
- Exact locations may exist privately for the author's logbook and personal analytics, but must not leak through public views.
- Privacy is more important than convenience when there is a conflict.

### Conceptual Location Tiers

All future location handling should be designed around explicit visibility tiers such as:

1. Private logbook only
2. Spot or waterbody name only
3. Public coarse region
4. Exact location visible only to the author and explicitly private contexts

Implementation expectations:

- Public fishing-related content must default to the safest viable visibility tier.
- Public map intelligence must be coarse and aggregated.
- Exact coordinates, exact pins, precise launch points, and honey-hole representations must not be exposed casually.
- APIs and client types must make public versus private location access explicit.
- Derived data products must not re-expose exact location through joins, metadata, or aggregation artifacts.

### Public Exposure Constraints

Exact private fishing location must not leak through:

- Public endpoints
- Public map overlays
- Public feed items
- Filter combinations
- Search results
- Client-side type overexposure
- Debug payloads
- Analytics exports
- Cache keys or precomputed objects

### Reverse Inference Risk

Sparse combinations of region, species, time, and method can reveal more than intended.

Future agents must treat reverse inference as a real privacy threat. If a public view could let a user infer where someone likely fished, the design is too permissive.

## Anti-Spot-Burning and Anti-Inference Rules

Public fishing intelligence must be aggregation-based and privacy-safe.

The product must never optimize public experiences around the question:

Where exactly did someone just catch this fish?

That is explicitly the wrong product behavior.

Required safeguards:

- Minimum unique contributor thresholds before public insight is shown
- Suppression of sparse cells or weak region signals
- Recency weighting that does not expose real-time exact behavior
- Delayed publication where necessary
- Filtering constraints that prevent highly specific reverse inference
- No exact public fishing pins
- No "hotspot" design that rests on one or two reports

Rules of interpretation:

- One or two reports are not enough to expose a public hotspot.
- Species-specific public insight must appear only when enough data exists.
- Low-volume regions should favor "not enough data" over misleading specificity.
- Public aggregation logic must be privacy-safe by design, not patched later in UI.

## Confidence, Uncertainty, and Recency

Confidence and uncertainty are first-class product concepts.

Crowd signal is uncertain by default. Future agents must never present weak data with fabricated certainty.

Required product behavior:

- Communicate confidence clearly
- Distinguish weak from strong signals
- Always consider recency
- Provide explicit "not enough data" states
- Show when insight is model-based versus community-observed
- Avoid inflated summary labels that overstate evidence

Example state labels include:

- Unverified
- Single report
- Community confirmed
- Historical pattern
- Model-based insight
- Not enough data

Design implications:

- Recency must affect ranking and visibility.
- Old reports should not silently appear current.
- Public insight should represent uncertainty honestly.
- Forecast and community systems must reinforce trust through restraint, not overclaiming.

## Trust and Credibility Model

All user-generated reports are not equally trustworthy.

Future systems must support trust-aware surfacing and ranking.

Potential trust inputs include:

- Recency
- Structured completeness
- Internal consistency
- Agreement with known conditions
- Community confirmation
- Moderation history
- Historical contributor reliability
- Future credibility systems such as trusted reporter, local expert, or verified contributor

Supported trust states should include concepts such as:

- Unverified
- Single report
- Community confirmed
- Historical trend
- Verified contributor
- Local expert
- Trusted reporter

Requirements:

- Trust must affect prominence.
- Low-trust or contradictory data should be surfaced cautiously.
- Trust state must not imply certainty beyond available evidence.
- Systems should preserve the raw ingredients needed for future trust scoring.

## Personal Logbook Principle

Personal logging is core product value.

The product must create compounding private value for the user over time, even when nothing is surfaced publicly.

Future agents must preserve the ability for reports to power private long-term intelligence such as:

- Best surf conditions for this user
- Best catch conditions for this user
- Species versus conditions relationships
- Pattern learning over time
- "What works for me" insights
- Session and outing history

Data modeling rules:

- Do not discard structured details that may be useful for future analytics.
- Do not flatten reports into presentation-only records.
- Preserve relevant environmental, behavioral, and outcome fields where appropriate.
- Separate public visibility from private utility.

Private value is a core reason users will trust and continue using the product.

## Access and Logistics Are First-Class Intelligence

Trip viability depends on more than forecast quality or catch reports.

The product must support structured intelligence related to:

- Parking
- Closures
- Access restrictions
- Hazards
- Changing beach access
- Gate status
- Region-specific logistical constraints

Requirements:

- These signals should be collectable in structured form.
- They should be moderate-able.
- They should be visible in ways that help trip planning.
- They should not be buried beneath generic social activity.

## Security and Privacy Are Non-Negotiable

This repository must be developed with a defensive posture.

Future agents must follow these rules:

- Never trust client input.
- Enforce authorization server-side.
- Validate all payloads and structured fields.
- Sanitize user-generated text.
- Prevent XSS, injection, and unsafe rendering.
- Treat file uploads as untrusted input.
- Avoid leaking private fields through public endpoints, shared types, cached objects, or client models.
- Apply least privilege to all read and write paths.

Security is part of correctness, not an optional enhancement.

## Authorization and Data Boundary Rules

Future implementations must preserve clear public/private boundaries.

Requirements:

- Public and private data access paths must be explicit.
- Authorization checks must happen on trusted server boundaries.
- Never rely on hidden UI controls for privacy.
- Schema design, API types, selectors, and serializers must all respect visibility boundaries.
- Private location, moderation metadata, and internal trust signals must not leak to unauthorized contexts.

When designing new features, assume the client is hostile and every public response may be inspected.

## Validation Rules

All write paths must validate:

- Required fields
- Enum values
- Value ranges
- Field lengths
- Allowed file types
- Report type constraints
- Visibility rules
- Domain-specific invariants

Examples:

- A catch report must not bypass privacy-sensitive location rules.
- A structured report must not silently degrade into arbitrary unvalidated text.
- Public report visibility must not exceed what the author selected and what policy allows.

## User-Generated Text Handling

Free text should remain supplementary, not structurally primary.

Requirements:

- Sanitize all user text before rendering.
- Prevent script injection and unsafe HTML paths.
- Limit text length to reduce abuse and storage bloat.
- Preserve structured fields as the canonical source of meaning.
- Avoid product designs that depend on long-form public posting as the default mode.

## File Upload Security

Uploads are high-risk surfaces.

Unless explicitly expanded later, MVP upload support should be images only.

Requirements:

- Enforce file size limits
- Validate MIME type server-side
- Validate extension separately
- Do not trust client-provided metadata
- Use safe storage paths and generated identifiers
- Prevent unsafe rendering and inline execution
- Avoid direct arbitrary user-controlled public URLs
- Preserve authorization and visibility boundaries around uploaded media

Agents must assume uploaded files may be malformed, mislabeled, hostile, or privacy-sensitive.

## Abuse Prevention and Moderation

Crowdsourced systems are high-abuse surfaces.

Future implementations must be abuse-aware from the beginning.

Required considerations:

- Rate limiting
- Spam prevention
- Duplicate or suspicious content handling
- Moderation states
- User reporting workflows
- Abuse detection hooks
- Reviewability of suspicious public signals

Design principle:

If a system can be gamed, flooded, or manipulated in ways that degrade trust, it will be. Build accordingly.

## Performance Requirements

The forecast experience is performance-sensitive and must remain protected.

Future community features must not degrade:

- Map performance
- Overview page responsiveness
- Forecast page rendering
- Chart performance
- Image loading performance
- Client bundle size

Implementation expectations:

- Lazy load non-critical community modules
- Keep map overlays efficient and bounded
- Avoid blocking forecast rendering on community data
- Avoid expensive client-side joins on initial view load
- Use additive enhancement patterns rather than centralizing all page work behind community features
- Treat forecast-critical rendering paths as the highest performance priority

If a community feature threatens the speed or clarity of the forecast experience, redesign it.

## Architecture Principles

Future work must follow these architecture principles:

- Modularity
- Separation of concerns
- Clear public/private data boundaries
- Minimal coupling to forecast logic
- Extensibility for analytics and trust models
- Scalable query design
- Privacy-safe aggregation boundaries
- Alignment with officially documented and supportable implementation patterns

### Architectural Rules

- Keep structured reporting, aggregation, forecasting, moderation, and presentation concerns separated.
- Do not entangle public social features directly with forecast-critical code paths.
- Preserve independent evolution of surf and fishing domain models where needed.
- Design aggregation layers so privacy and threshold rules can be enforced centrally.
- Avoid schema or API designs that require major rewrites to support future trust scoring, analytics, or suppression logic.

## Data Modeling Principles

Future agents must model for long-term intelligence, not just near-term display.

Requirements:

- Prefer structured fields over opaque text.
- Preserve report type distinctions.
- Preserve outcome, observation, context, and visibility separately.
- Keep author-private data separable from public derivatives.
- Design public summaries as derived products, not the source of truth.
- Preserve enough metadata to support future personal analytics, confidence modeling, and ranking.

Public intelligence should usually be derived from underlying structured records, not authored as free-form public claims.

## Aggregation Design Principles

Aggregation logic must be privacy-safe, trust-aware, and sparse-data-aware.

Requirements:

- Enforce minimum thresholds before public insight is displayed
- Distinguish observed reports from inferred summaries
- Include recency logic
- Support suppression states
- Support "not enough data" outcomes
- Avoid exactness that exceeds underlying evidence quality

Derived community insight should be treated as a product surface with its own correctness requirements.

## API and Exposure Principles

When adding or changing APIs:

- Expose the minimum necessary data
- Separate public and private response contracts
- Avoid overbroad shared DTOs that include sensitive fields by default
- Make visibility rules explicit in serializers and handlers
- Do not let convenience-driven API design bypass privacy boundaries

If an endpoint serves public experiences, assume attackers will probe for hidden fields and inference opportunities.

## UX and Presentation Rules

Future agents must preserve a utility-first experience.

Requirements:

- Forecast and conditions data remain visually primary.
- Community information should be contextual and decision-supporting.
- Use labels that communicate uncertainty, recency, and evidence strength.
- Prefer structured cards, summaries, and report metadata over feed-style noise.
- Avoid interfaces that resemble a generic social timeline.
- Do not reward sensational, low-signal, or privacy-invasive content patterns.

The product should feel like a serious decision-support tool with optional community intelligence, not a content app.

## Testing Requirements

All meaningful changes in community, privacy, visibility, or reporting logic should include test coverage.

Required coverage areas include:

- Authorization
- Privacy boundaries
- Aggregation thresholds
- Validation
- UI regressions
- Community visibility rules
- Report type logic
- Moderation states

Where applicable, also test:

- Sparse-data suppression
- Trust state handling
- Public versus private serialization differences
- Upload validation and access control
- Recency and confidence labeling logic

Untested privacy or visibility logic should be treated as unsafe.

## Dependency Policy

Dependencies are long-term maintenance decisions.

Requirements:

- Minimize new dependencies
- Prefer actively maintained libraries
- Avoid unnecessary packages
- Evaluate security posture and maintenance cost before adding anything
- Prefer existing platform capabilities when reasonable
- Prefer dependencies with strong official documentation and stable ecosystem adoption

Do not add a dependency merely to speed up a small implementation if it increases long-term attack surface or maintenance burden.

## Scalability and Future-Proofing

Architecture should support future capabilities without forcing major rewrites.

Future-facing requirements include support for:

- Personal analytics
- Confidence modeling
- Historical pattern learning
- Smarter ranking of community signal
- Machine learning or heuristic insight systems
- Evolving credibility models
- Privacy-safe public intelligence expansion

When designing schemas, services, or APIs, optimize for extension without violating privacy, performance, or clarity.

## Decision Rules for Future Agents

When making tradeoffs, prefer the option that:

- Protects forecast performance
- Preserves privacy
- Reduces spot-burning risk
- Makes uncertainty explicit
- Increases structured signal quality
- Preserves private long-term value
- Minimizes abuse surface
- Keeps public/private boundaries clear
- Follows official documentation and industry-standard implementation patterns

Avoid options that:

- Turn the product into a generic social feed
- Expose exact public fishing activity
- Overstate weak evidence
- Create privacy leaks through aggregation or filters
- Mix surf and fishing semantics carelessly
- Add heavy coupling between forecast systems and community systems
- Sacrifice long-term integrity for short-term engagement
- Depend on hacks, brittle workarounds, or undocumented behavior as the default solution

## Default Behavioral Guidance

If requirements are ambiguous, future agents should default to:

- Safer location visibility
- More explicit uncertainty
- Stronger validation
- Narrower data exposure
- Lower coupling
- Better forecast performance protection
- More structured reporting
- Less social noise
- Officially documented patterns over improvised solutions

If a feature creates tension between utility and privacy, prefer privacy-safe utility.

If a feature creates tension between engagement and trust, prefer trust.

If a feature creates tension between speed of shipping and correctness of visibility or authorization, prefer correctness.

## Final Standard

This product should become a trusted coastal intelligence system, not a noisy social platform.

Forecast quality, privacy-safe community intelligence, practical trip planning, personal logbook value, and defensible engineering discipline are the standards future agents must uphold.
