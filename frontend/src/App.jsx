import { useEffect, useState } from 'react'
import { healthResponseSchema } from '@education/shared'

export default function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok')
        return res.json()
      })
      .then((data) => {
        const result = healthResponseSchema.safeParse(data)
        if (result.success) {
          setHealth(result.data)
        } else {
          setError('Invalid health response shape')
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-8 shadow-xl text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">Education Platform</h1>
        {error ? (
          <p className="text-red-500">Error connecting to backend: {error}</p>
        ) : health ? (
          <p className="text-green-600">
            Backend connected (Phase {health.phase}, Status: {health.status})
          </p>
        ) : (
          <p className="text-gray-500 animate-pulse">Connecting to backend...</p>
        )}
      </div>
    </div>
  )
}
