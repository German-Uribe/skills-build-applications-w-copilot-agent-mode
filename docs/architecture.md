# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep route-level views focused on rendering. Use the shared API client for relative `/api` requests and give each view accessible loading, empty, error, and populated states. Do not add authentication.
- Logic tier decision: Keep HTTP parsing, validation, status codes, and response shapes in the Express routes; put reusable data operations and capability rules in the service layer. Reject malformed IDs before querying MongoDB and return deliberate 4xx responses for invalid or missing resources.
- Data tier decision: Define required fields, defaults, and references in the Mongoose models. Preserve unrelated records during seeding and keep seed operations idempotent.
- Activity tracking approach: Validate the submitted user and team IDs and confirm both records exist before creating an activity. Store their references, the submitted type and minutes, points derived from minutes, and the occurrence time; list activities using the API contract shape.
- Team management approach: Require a name, preserve the submitted name and mascot, default members to an empty array, and retain provided member references when creating and listing teams.
- Leaderboard approach: Aggregate activity points per team, sort highest total first, and return team names, totals, and 1-based ranks.
- Workout suggestions approach: Find the user by email, use recent activity or the user's fitness goal to select a matching workout focus, and include a short reason. Return a deliberate 4xx when no user matches.

## Test plan

Run the focused contract tests in dependency order, then build both tiers. The backend contract tests use an in-memory MongoDB; they do not require the local MongoDB service.

| Command | What a failure indicates | Baseline result |
| --- | --- | --- |
| `npm run test:data --prefix octofit-tracker/backend` | Model required fields, defaults, references, or seed idempotency do not meet the data contract. | 4 of 5 tests fail: user, team, activity, and workout required-field validation. Seed test passes. |
| `npm run test:api --prefix octofit-tracker/backend` | Route validation, persistence, response shape, ranking, or recommendation behavior violates the API contract. | All 4 tests fail: activity and team creation return 501, leaderboard is empty, and workout suggestions lack a reason. |
| `npm test --prefix octofit-tracker/frontend` | A view is missing API behavior, accessible loading/empty/error states, or expected rendered data. | All 15 tests fail while views report implementation pending. |
| `npm run build --prefix octofit-tracker/backend` | Backend TypeScript contains compile-time errors. | Passes. |
| `npm run build --prefix octofit-tracker/frontend` | Frontend TypeScript or Vite production build fails. | Passes. |
