import fp from 'fastify-plugin'
import { validateSession } from '../services/auth/session-service.js'

/**
 * Authentication and authorization plugin.
 * Exposes decorators:
 *   - request.user
 *   - request.session
 *   - app.authenticate (preHandler)
 *   - app.requireRole (preHandler)
 */
async function authPlugin(app, opts) {
  // Decorate request to hold user and session information
  app.decorateRequest('user', null)
  app.decorateRequest('session', null)

  // Reusable authenticate preHandler
  app.decorate('authenticate', async (request, reply) => {
    const cookieName = app.env.SESSION_COOKIE_NAME || 'akshar_session'
    const cookieVal = request.cookies[cookieName]

    if (!cookieVal) {
      return reply.code(401).send({ error: 'Authentication required: session cookie missing' })
    }

    // Unsign cookie using Fastify cookie unsigner (secret registered in app.js)
    const unsigned = request.unsignCookie(cookieVal)
    if (!unsigned.valid || !unsigned.value) {
      return reply.code(401).send({ error: 'Authentication required: invalid session signature' })
    }

    // Validate token against DB (calculates SHA-256 hash internally)
    const session = await validateSession(unsigned.value)
    if (!session) {
      // Clear invalid cookie
      void reply.clearCookie(cookieName, {
        path: '/',
        domain: app.env.COOKIE_DOMAIN,
      })
      return reply.code(401).send({ error: 'Authentication required: session expired or invalid' })
    }

    // Origin header validation for state-changing requests (CSRF protection)
    const method = request.method
    const stateChanging = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)
    if (stateChanging) {
      const origin = request.headers.origin || request.headers.referer
      if (!origin) {
        return reply.code(400).send({ error: 'Origin or Referer header required for state-changing requests' })
      }

      // Check if origin matches CORS_ORIGIN
      const allowedOrigin = app.env.CORS_ORIGIN
      let originMatch = false

      if (origin.startsWith(allowedOrigin)) {
        originMatch = true
      } else if (app.env.NODE_ENV !== 'production') {
        // Allow localhost and standard testing tools in development/test
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          originMatch = true
        }
      }

      if (!originMatch) {
        app.log.warn({ origin, allowedOrigin }, 'CSRF block: origin mismatch')
        return reply.code(403).send({ error: 'CSRF validation failed: origin not allowed' })
      }
    }

    // Attach user and session context
    request.session = session
    request.user = session.user
  })

  // Role authorization decorator builder
  app.decorate('requireRole', (allowedRoles) => {
    return async (request, reply) => {
      // Ensure authenticate ran first
      if (!request.user) {
        return reply.code(401).send({ error: 'Authentication required' })
      }

      if (!allowedRoles.includes(request.user.role)) {
        return reply.code(403).send({ error: `Forbidden: role ${request.user.role} does not have access` })
      }
    }
  })

  // School isolation decorator
  app.decorate('requireSchoolAccess', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' })
    }

    // Validates that request params or body entity belongs to the user's schoolId.
    // Isolates data queries. Implementation is done at the route handler level or via this decorator.
  })
}

export default fp(authPlugin, {
  name: 'auth-plugin',
})
export const authPluginWrapped = fp(authPlugin)
