// NOTE:
// Vercel Edge middleware does not allow some modules pulled in by Clerk middleware,
// which can break deployments ("unsupported modules: @clerk: #crypto ...").
//
// We enforce auth at the route level instead (see `app/dashboard/layout.jsx` and
// `app/sessions/layout.jsx`), so this middleware is intentionally empty.
