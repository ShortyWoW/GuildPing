import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare, Shield, User, Clock, ArrowRight, Heart, MapPin, Award } from 'lucide-react'
import { useAuth } from '../App'

interface PlayerProfile {
  id: number
  user_id: number
  character_name: string
  realm: string
  region: string
  class_name: string
  spec_name: string
  role: string
  faction: string
}

interface GuildProfile {
  id: number
  owner_user_id: number
  guild_name: string
  realm: string
  region: string
  faction: string
  progression_label: string
}

interface Match {
  id: number
  status: string
  created_at: string
  player_profile: PlayerProfile
  guild_profile: GuildProfile
}

const Matches: React.FC = () => {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      navigate("/login")
      return
    }

    const fetchMatches = async () => {
      try {
        const res = await fetch("/api/matches", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setMatches(data)
        }
      } catch (err) {
        console.error("Failed to load matches:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [token, navigate])

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-charcoal-dark text-white">
        <div className="animate-pulse flex items-center gap-2">
          <Clock className="animate-spin h-5 w-5 text-accent" />
          <span>Opening matchmaking gates...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-charcoal-dark min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-glow-purple text-white flex items-center gap-2.5">
          <Heart className="h-8 w-8 text-accent fill-accent/10 animate-pulse" /> My Recruitment Matches
        </h1>
        <p className="text-slate-400 text-sm mt-2">Mutual interest unlocks direct real-time communication between players and recruiters.</p>
      </div>

      {matches.length === 0 ? (
        <div className="bg-charcoal border border-charcoal-light rounded-2xl p-16 text-center space-y-6">
          <MessageSquare className="h-12 w-12 mx-auto text-charcoal-light" />
          <p className="text-sm text-slate-400 max-w-md mx-auto">No active matches found. Find guilds or search player characters and express interest to start matching.</p>
          <div className="flex justify-center gap-3">
            <Link to="/guilds" className="bg-accent hover:bg-accent-dark text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-glow-purple">
              Find Guilds
            </Link>
            <Link to="/players" className="bg-charcoal-dark border border-charcoal-light hover:border-slate-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl">
              Recruit Raiders
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map(match => {
            const isPlayerOwner = match.player_profile.user_id === user?.id
            
            return (
              <div key={match.id} className="bg-charcoal border border-charcoal-light rounded-2xl p-6 hover:border-charcoal-light transition-all flex flex-col justify-between gap-6 glow-card">
                <div className="space-y-4">
                  {/* Factions match headers */}
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-charcoal-light pb-2">
                    <span>Matched on {new Date(match.created_at).toLocaleDateString()}</span>
                    <span className="text-accent-light">Status: {match.status}</span>
                  </div>

                  {/* Visual Connection */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Player Character */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 text-accent" />
                        <span className="font-extrabold text-white text-sm">{match.player_profile.character_name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{match.player_profile.spec_name} {match.player_profile.class_name}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" /> {match.player_profile.realm} ({match.player_profile.region})
                      </p>
                      {isPlayerOwner && (
                        <span className="inline-block bg-accent/10 text-accent-light text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 border border-accent/20">Your Raider</span>
                      )}
                    </div>

                    <div className="flex items-center justify-center shrink-0">
                      <div className="h-10 w-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                        <Heart className="h-5 w-5 text-accent fill-accent/25" />
                      </div>
                    </div>

                    {/* Guild Profile */}
                    <div className="space-y-1.5 text-right flex-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-extrabold text-white text-sm">&lt;{match.guild_profile.guild_name}&gt;</span>
                        <Shield className="h-4 w-4 text-accent" />
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center justify-end gap-1 font-semibold">
                        <Award className="h-3.5 w-3.5 text-amber-500" /> {match.guild_profile.progression_label}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center justify-end gap-1">
                        <MapPin className="h-2.5 w-2.5" /> {match.guild_profile.realm} ({match.guild_profile.region})
                      </p>
                      {!isPlayerOwner && (
                        <span className="inline-block bg-accent/10 text-accent-light text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 border border-accent/20">Your Guild</span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/matches/${match.id}/messages`}
                  className="w-full bg-accent hover:bg-accent-dark text-white text-xs font-bold py-3 px-4 rounded-xl shadow-glow-purple flex items-center justify-center gap-1.5 transition-all"
                >
                  <MessageSquare className="h-4 w-4" /> Chat Instantly
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Matches
