import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Shield, Sparkles } from 'lucide-react'
import { useAuth } from '../App'

const Login: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")
    const err = searchParams.get("error")
    if (token) {
      login(token)
      navigate("/dashboard")
    } else if (err) {
      if (err === "token_exchange_failed") {
        setError("Failed to exchange token with Battle.net. Please try again.")
      } else if (err === "missing_access_token") {
        setError("Battle.net authentication did not return an access token.")
      } else if (err === "profile_fetch_failed") {
        setError("Failed to fetch Battle.net profile details.")
      } else if (err === "invalid_profile_details") {
        setError("Battle.net profile details were invalid.")
      } else {
        setError("An error occurred during Battle.net authentication.")
      }
    }
  }, [searchParams, login, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      if (res.ok) {
        const data = await res.json()
        login(data.access_token)
        navigate("/dashboard")
      } else {
        const data = await res.json()
        setError(data.detail || "Authentication failed. Verify credentials.")
      }
    } catch {
      setError("Server connection failed. Try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-grow flex items-center justify-center bg-charcoal-dark py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-charcoal border border-charcoal-light p-8 rounded-2xl shadow-2xl relative">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="text-center relative z-10">
          <div className="inline-flex h-12 w-12 rounded-xl bg-accent/20 items-center justify-center text-accent mb-4">
            <Sparkles className="h-6 w-6 text-glow-purple" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">Login to Guild<span className="text-accent">Ping</span></h2>
          <p className="mt-2 text-sm text-slate-400">
            Or{' '}
            <Link to="/register" className="font-bold text-accent-light hover:text-accent transition-colors">
              create a free account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-rose-900/30 border border-rose-500/40 text-rose-200 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6 relative z-10" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="reaper@shadowlands.com"
                className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm focus:border-accent focus:outline-none transition-colors text-white"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm focus:border-accent focus:outline-none transition-colors text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-dark text-white py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow-purple flex items-center justify-center"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="relative my-6 z-10">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-charcoal-light"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-charcoal px-3 text-slate-400 font-bold tracking-wider">Or continue with</span>
          </div>
        </div>

        <a
          href="/api/auth/blizzard/login"
          className="w-full bg-[#00172e] hover:bg-[#00254c] text-[#00aeff] border border-[#00aeff]/30 hover:border-[#00aeff]/60 py-3 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-md hover:shadow-[0_0_15px_rgba(0,174,255,0.3)] z-10 relative"
        >
          <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current">
            <title>Battle.net</title>
            <path d="M1.846 0 0 3.333v17.436l1.846 1.795 10.667-6.154V6.154L1.846 0zm10.718 14.256L5.744 18.05V5.949l6.82 3.846v4.461zM4.103 2.82l6.82 3.846v8.205L4.103 11.026V2.82z"/>
          </svg>
          Login with Battle.net
        </a>
      </div>
    </div>
  )
}

export default Login
