import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Sparkles } from 'lucide-react'
import { useAuth } from '../App'

const Register: React.FC = () => {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1. Perform registration
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password })
      })

      if (regRes.ok) {
        // 2. Perform auto-login
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        })
        
        if (loginRes.ok) {
          const data = await loginRes.json()
          login(data.access_token)
          navigate("/dashboard")
        } else {
          navigate("/login")
        }
      } else {
        const data = await regRes.json()
        setError(data.detail || "Registration failed. Verify credentials.")
      }
    } catch {
      setError("Server connection failed. Try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="flex-grow flex items-center justify-center bg-charcoal-dark py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8 bg-charcoal border border-charcoal-light p-8 rounded-2xl shadow-2xl relative">
        {/* Glow accent */}
        <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="text-center relative z-10">
          <div class="inline-flex h-12 w-12 rounded-xl bg-accent/20 items-center justify-center text-accent mb-4">
            <Sparkles class="h-6 w-6 text-glow-purple" />
          </div>
          <h2 class="text-3xl font-extrabold text-white">Create an Account</h2>
          <p class="mt-2 text-sm text-slate-400">
            Or{' '}
            <Link to="/login" class="font-bold text-accent-light hover:text-accent transition-colors">
              login with existing account
            </Link>
          </p>
        </div>

        {error && (
          <div class="bg-rose-900/30 border border-rose-500/40 text-rose-200 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <form class="mt-8 space-y-6 relative z-10" onSubmit={handleSubmit}>
          <div class="space-y-4">
            <div>
              <label for="email" class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="reaper@shadowlands.com"
                class="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm focus:border-accent focus:outline-none transition-colors text-white"
              />
            </div>
            <div>
              <label for="username" class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Username</label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="RagnarosSlayer"
                class="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm focus:border-accent focus:outline-none transition-colors text-white"
              />
            </div>
            <div>
              <label for="password" class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                class="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm focus:border-accent focus:outline-none transition-colors text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            class="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-purple flex items-center justify-center"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Register
