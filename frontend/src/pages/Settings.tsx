import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Shield, ShieldAlert, Sparkles, Key, Clock, CheckCircle } from 'lucide-react'
import { useAuth } from '../App'

const Settings: React.FC = () => {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  
  const [playerCount, setPlayerCount] = useState(0)
  const [guildCount, setGuildCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      navigate("/login")
      return
    }

    const fetchCounts = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const pRes = await fetch("/api/players", { headers })
        const gRes = await fetch("/api/guilds", { headers })
        
        if (pRes.ok && gRes.ok) {
          const allPlayers = await pRes.json()
          const allGuilds = await gRes.json()
          
          setPlayerCount(allPlayers.filter((p: any) => p.user_id === user?.id).length)
          setGuildCount(allGuilds.filter((g: any) => g.owner_user_id === user?.id).length)
        }
      } catch (err) {
        console.error("Failed to load settings counts:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCounts()
  }, [token, user])

  return (
    <div class="bg-charcoal-dark min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 class="text-3xl font-black text-glow-purple text-white flex items-center gap-2.5">
          <User class="h-8 w-8 text-accent animate-pulse" /> User Settings
        </h1>
        <p class="text-slate-400 text-sm mt-2">Manage your account information, security policies, and linked profile assets.</p>
      </div>

      <div class="bg-charcoal border border-charcoal-light rounded-2xl p-8 shadow-2xl space-y-8">
        
        {/* Profile Card */}
        <div class="flex items-center gap-4 bg-charcoal-dark p-6 rounded-2xl border border-charcoal-light">
          <div class="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center font-black text-white text-2xl shadow-glow-purple uppercase">
            {user?.username?.substring(0, 2) || "GP"}
          </div>
          <div>
            <h3 class="text-xl font-extrabold text-white">{user?.username}</h3>
            <p class="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <Mail class="h-3.5 w-3.5" /> {user?.email}
            </p>
          </div>
        </div>

        {/* Account Details Form */}
        <div class="space-y-4">
          <h4 class="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-charcoal-light pb-2">
            Account Metadata
          </h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div class="bg-charcoal-dark border border-charcoal-light p-4 rounded-xl space-y-1">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account Role</span>
              <p class="text-sm font-bold text-white flex items-center gap-1.5">
                {user?.is_admin ? (
                  <>
                    <ShieldAlert class="h-4 w-4 text-rose-400" /> Site Administrator
                  </>
                ) : (
                  <>
                    <Shield class="h-4 w-4 text-emerald-400" /> Standard User
                  </>
                )}
              </p>
            </div>

            <div class="bg-charcoal-dark border border-charcoal-light p-4 rounded-xl space-y-1">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Listings</span>
              <p class="text-sm font-bold text-white flex items-center gap-3">
                <span class="flex items-center gap-1"><Sparkles class="h-3.5 w-3.5 text-accent" /> {loading ? "..." : playerCount} Raider(s)</span>
                <span class="flex items-center gap-1"><Shield class="h-3.5 w-3.5 text-accent" /> {loading ? "..." : guildCount} Guild(s)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Security Summary */}
        <div class="space-y-4">
          <h4 class="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-charcoal-light pb-2">
            Security & Session
          </h4>

          <div class="flex items-start gap-3 bg-charcoal-dark p-4 rounded-xl border border-charcoal-light">
            <Key class="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div class="space-y-1">
              <p class="text-xs font-bold text-white">Active Session Duration</p>
              <p class="text-[11px] text-slate-400">
                Your authenticated session is validated via JWT key storage and expires automatically after 7 days of inactivity.
              </p>
              <div class="flex items-center gap-1 text-[10px] text-emerald-400 font-bold pt-1.5">
                <CheckCircle class="h-3 w-3" /> System Secures Communications via SSL/TLS Tunnel
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Settings
