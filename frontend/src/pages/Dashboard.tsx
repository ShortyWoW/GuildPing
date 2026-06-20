import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Plus, Edit2, Search, ArrowRight, MessageSquare, Check, X, Shield, Clock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../App'

export const CLASS_COLORS: Record<string, string> = {
  "death knight": "#C41F3B",
  "demon hunter": "#A330C9",
  "druid": "#FF7D0A",
  "evoker": "#33937F",
  "hunter": "#ABD473",
  "mage": "#3FC7EB",
  "monk": "#00FF96",
  "paladin": "#F58CBA",
  "priest": "#FFFFFF",
  "rogue": "#FFF569",
  "shaman": "#0070DE",
  "warlock": "#8787ED",
  "warrior": "#C79C6E"
};

export const getClassColor = (className: string) => {
  if (!className) return "#A3A3A3";
  return CLASS_COLORS[className.toLowerCase()] || "#A3A3A3";
};

interface PlayerProfile {
  id: number
  character_name: string
  realm: string
  region: string
  faction: string
  class_name: string
  spec_name: string
  role: string
  item_level?: number | null
  is_verified: boolean
  blizzard_character_id?: number | null
  avatar_url?: string | null
  recruitment_status: string
  goals: string[]
}

interface GuildProfile {
  id: number
  guild_name: string
  realm: string
  region: string
  faction: string
  recruitment_status: string
  progression_label: string
  is_verified?: boolean
}

interface Interest {
  id: number
  player_profile_id: number
  guild_profile_id: number
  body: string
}

interface Match {
  id: number
  status: string
  created_at: string
  player_profile: { id: number; character_name: string; realm: string; class_name: string; spec_name: string }
  guild_profile: { id: number; guild_name: string; realm: string; progression_label: string }
}

const Dashboard: React.FC = () => {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<PlayerProfile[]>([])
  const [guilds, setGuilds] = useState<GuildProfile[]>([])
  const [interests, setInterests] = useState<Interest[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  // Blizzard Character Import & Verification States
  const [showImportModal, setShowImportModal] = useState(false)
  const [importingCharacters, setImportingCharacters] = useState<any[]>([])
  const [importModalLoading, setImportModalLoading] = useState(false)
  const [importModalError, setImportModalError] = useState<string | null>(null)
  const [importRegion, setImportRegion] = useState("us")
  const [importLoadingMap, setImportLoadingMap] = useState<Record<string, boolean>>({})

  // Blizzard Guild Import States
  const [showGuildImportModal, setShowGuildImportModal] = useState(false)
  const [importingGuilds, setImportingGuilds] = useState<any[]>([])
  const [guildImportLoading, setGuildImportLoading] = useState(false)
  const [guildImportError, setGuildImportError] = useState<string | null>(null)
  const [guildImportLoadingMap, setGuildImportLoadingMap] = useState<Record<string, boolean>>({})

  const fetchBlizzardCharacters = async (region: string) => {
    setImportModalLoading(true)
    setImportModalError(null)
    try {
      const res = await fetch(`/api/auth/blizzard/characters?region=${region}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setImportingCharacters(data)
      } else {
        const data = await res.json()
        setImportModalError(data.detail || "Failed to load Battle.net characters.")
      }
    } catch {
      setImportModalError("Network error. Could not connect to the server.")
    } finally {
      setImportModalLoading(false)
    }
  }

  const handleImportCharacter = async (char: any, role: string) => {
    setImportLoadingMap(prev => ({ ...prev, [char.id]: true }))
    try {
      const res = await fetch("/api/players/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          character_name: char.name,
          realm_slug: char.realm.slug,
          region: importRegion,
          role: role
        })
      })
      if (res.ok) {
        const newProfile = await res.json()
        setPlayers(prev => [...prev, newProfile])
        setImportingCharacters(prev => prev.filter(c => c.id !== char.id))
      } else {
        const errData = await res.json()
        alert(errData.detail || "Failed to import character.")
      }
    } catch {
      alert("Error connecting to server.")
    } finally {
      setImportLoadingMap(prev => ({ ...prev, [char.id]: false }))
    }
  }

  const handleVerifyCharacter = async (playerId: number) => {
    try {
      const res = await fetch(`/api/players/${playerId}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const updatedProfile = await res.json()
        setPlayers(prev => prev.map(p => p.id === playerId ? updatedProfile : p))
        alert("Character verified successfully!")
      } else {
        const errData = await res.json()
        alert(errData.detail || "Verification failed.")
      }
    } catch {
      alert("Error connecting to server.")
    }
  }

  const fetchImportableGuilds = async () => {
    setGuildImportLoading(true)
    setGuildImportError(null)
    try {
      const res = await fetch("/api/guilds/blizzard/importable", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setImportingGuilds(data)
      } else {
        const data = await res.json()
        setGuildImportError(data.detail || "Failed to load importable guilds from Battle.net.")
      }
    } catch {
      setGuildImportError("Network error. Could not connect to the server.")
    } finally {
      setGuildImportLoading(false)
    }
  }

  const handleImportGuild = async (guild: any) => {
    const key = `${guild.guild_name}-${guild.guild_id}`
    setGuildImportLoadingMap(prev => ({ ...prev, [key]: true }))
    try {
      const res = await fetch("/api/guilds/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          character_name: guild.character_name,
          realm_slug: guild.realm_slug,
          region: guild.region,
          guild_name: guild.guild_name,
          guild_id: guild.guild_id
        })
      })
      if (res.ok) {
        const newGuild = await res.json()
        setGuilds(prev => [...prev, newGuild])
        setImportingGuilds(prev => prev.filter(g => g.guild_id !== guild.guild_id))
        alert(`Guild <${guild.guild_name}> imported successfully!`)
      } else {
        const errData = await res.json()
        alert(errData.detail || "Failed to import guild.")
      }
    } catch {
      alert("Error connecting to server.")
    } finally {
      setGuildImportLoadingMap(prev => ({ ...prev, [key]: false }))
    }
  }

  useEffect(() => {
    if (!token) {
      navigate("/login")
      return
    }

    const fetchData = async () => {
      try {
        // Fetch current user's player profiles, guild profiles, and interests
        const headers = { Authorization: `Bearer ${token}` }
        
        // 1. Fetch all players (filter by user ownership on backend, or fetch all and filter locally)
        const pRes = await fetch("/api/players", { headers })
        const gRes = await fetch("/api/guilds", { headers })
        
        if (pRes.ok && gRes.ok) {
          const allPlayers = await pRes.json()
          const allGuilds = await gRes.json()
          
          // Filter owned profiles
          const ownedPlayers = allPlayers.filter((p: any) => p.user_id === user?.id)
          const ownedGuilds = allGuilds.filter((g: any) => g.owner_user_id === user?.id)
          
          setPlayers(ownedPlayers)
          setGuilds(ownedGuilds)
          
          // Fetch interests for these profiles
          // Fetch inbox notifications/interests
          // We can fetch interests by matching from/to profiles
          // Let's call interests api if it exists, or list notifications
          const iRes = await fetch("/api/notifications", { headers })
          if (iRes.ok) {
            const notifs = await iRes.json()
            // Extract incoming interests from notifications payload
            const incomingInterests = notifs
              .filter((n: any) => n.type === "interest_received" && !n.is_read)
              .map((n: any) => ({
                id: n.payload.interest_id,
                player_profile_id: n.payload.player_profile_id,
                guild_profile_id: n.payload.guild_profile_id,
                body: n.body
              }))
            setInterests(incomingInterests)
          }

          // Fetch active matches
          const mRes = await fetch("/api/matches", { headers })
          if (mRes.ok) {
            const allMatches = await mRes.json()
            setMatches(allMatches)
          }
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token, user])

  const handleAcceptInterest = async (interestId: number) => {
    if (!token) return
    try {
      const res = await fetch(`/api/interests/${interestId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setInterests(prev => prev.filter(i => i.id !== interestId))
        // Relock navigation to matches page
        navigate("/matches")
      }
    } catch (err) {
      console.error("Failed to accept interest:", err)
    }
  }

  const handleDeclineInterest = async (interestId: number) => {
    if (!token) return
    try {
      const res = await fetch(`/api/interests/${interestId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setInterests(prev => prev.filter(i => i.id !== interestId))
      }
    } catch (err) {
      console.error("Failed to decline interest:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center bg-charcoal-dark text-white">
        <div className="animate-pulse flex items-center gap-2">
          <Clock className="animate-spin h-5 w-5 text-accent" />
          <span>Loading recruitment metrics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-charcoal-dark min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-charcoal-light pb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Welcome back, {user?.username}</h1>
          <p className="text-slate-400 text-sm">Manage your profiles, incoming recruitment offers, and active chats.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/guilds" className="bg-accent hover:bg-accent-dark text-white px-5 py-3 rounded-xl text-sm font-bold shadow-glow-purple flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all">
            <Search className="h-4 w-4" /> Find a Guild
          </Link>
          <Link to="/players" className="bg-charcoal border border-charcoal-light hover:border-slate-400 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all">
            <Plus className="h-4 w-4" /> Recruit Players
          </Link>
        </div>
      </div>

      {/* Grid Dashboard columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Player Profiles */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-charcoal-light pb-3">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> My Player Characters
            </h3>
            <div className="flex items-center gap-3">
              {user?.battlenet_id && (
                <button
                  onClick={() => { setShowImportModal(true); fetchBlizzardCharacters(importRegion); }}
                  className="text-xs font-bold text-[#00aeff] hover:text-[#33beff] flex items-center gap-1.5 bg-none border-none outline-none focus:outline-none"
                >
                  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 fill-current">
                    <path d="M1.846 0 0 3.333v17.436l1.846 1.795 10.667-6.154V6.154L1.846 0zm10.718 14.256L5.744 18.05V5.949l6.82 3.846v4.461zM4.103 2.82l6.82 3.846v8.205L4.103 11.026V2.82z"/>
                  </svg>
                  Import Character
                </button>
              )}
              <Link to="/players/create" className="text-xs font-bold text-accent-light hover:text-accent flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Create Profile
              </Link>
            </div>
          </div>

          {players.length === 0 ? (
            <div className="bg-charcoal border border-charcoal-light rounded-2xl p-8 text-center space-y-4">
              <p className="text-slate-400 text-sm">You haven't listed any WoW characters yet. Get discovered by guild recruiters.</p>
              <div className="flex justify-center gap-3">
                {user?.battlenet_id && (
                  <button 
                    onClick={() => { setShowImportModal(true); fetchBlizzardCharacters(importRegion); }}
                    className="inline-flex bg-[#00172e] hover:bg-[#00254c] text-[#00aeff] border border-[#00aeff]/30 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-[0_0_10px_rgba(0,174,255,0.2)] items-center gap-1.5"
                  >
                    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 fill-current">
                      <path d="M1.846 0 0 3.333v17.436l1.846 1.795 10.667-6.154V6.154L1.846 0zm10.718 14.256L5.744 18.05V5.949l6.82 3.846v4.461zM4.103 2.82l6.82 3.846v8.205L4.103 11.026V2.82z"/>
                    </svg>
                    Import from Battle.net
                  </button>
                )}
                <Link to="/players/create" className="inline-flex bg-accent hover:bg-accent-dark text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-glow-purple">
                  Create Player Profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {players.map(player => {
                const classColor = getClassColor(player.class_name);
                return (
                  <div 
                    key={player.id} 
                    className="border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-[0_4px_25px_rgba(0,0,0,0.4)]"
                    style={{
                      background: `linear-gradient(135deg, ${classColor}0A 0%, rgba(20, 20, 20, 0.95) 100%)`,
                      borderColor: `${classColor}22`,
                      boxShadow: `0 4px 20px rgba(0,0,0,0.2), inset 0 0 12px ${classColor}05`
                    }}
                  >
                    <div className="flex items-center gap-4 flex-grow">
                      {player.avatar_url ? (
                        <img 
                          src={player.avatar_url} 
                          alt={player.character_name} 
                          className="h-12 w-12 rounded-xl object-cover border-2 shadow-md shrink-0"
                          style={{ borderColor: classColor }}
                        />
                      ) : (
                        <div 
                          className="h-12 w-12 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0"
                          style={{ borderColor: `${classColor}44`, backgroundColor: `${classColor}11`, color: classColor }}
                        >
                          {player.character_name ? player.character_name.substring(0, 2).toUpperCase() : "?"}
                        </div>
                      )}
                      
                      <div className="space-y-2 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-black flex items-center gap-1.5" style={{ color: classColor }}>
                            {player.character_name}
                            {player.is_verified && (
                              <span title="Verified character from Blizzard APIs" className="inline-flex">
                                <ShieldCheck className="h-4.5 w-4.5 text-[#00aeff] drop-shadow-[0_0_5px_rgba(0,174,255,0.5)]" />
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-slate-400">@{player.realm} ({player.region})</span>
                          {!player.is_verified && user?.battlenet_id && (
                            <button
                              onClick={() => handleVerifyCharacter(player.id)}
                              className="text-[10px] text-slate-400 hover:text-[#00aeff] underline font-semibold transition-colors bg-none border-none outline-none cursor-pointer"
                            >
                              Verify Ownership
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-charcoal-dark border border-charcoal-light font-semibold" style={{ color: classColor }}>
                            {player.spec_name} {player.class_name}
                          </span>
                          {player.item_level ? (
                            <span className="px-2 py-0.5 rounded bg-charcoal-dark border border-charcoal-light text-wow-gold font-bold">
                              {player.item_level} iLvl
                            </span>
                          ) : null}
                          <span className="px-2 py-0.5 rounded bg-charcoal-dark border border-charcoal-light text-slate-300">
                            {player.role}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-bold">
                            {player.recruitment_status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link to={`/players/edit/${player.id}`} className="bg-charcoal-dark border border-charcoal-light hover:border-slate-400 text-white p-2.5 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Guild Recruitment */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-charcoal-light pb-3">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" /> My Guilds & Recruitment
            </h3>
            <div className="flex gap-2">
              {user?.battlenet_id && (
                <button 
                  onClick={() => { setShowGuildImportModal(true); fetchImportableGuilds(); }}
                  className="inline-flex bg-charcoal border border-charcoal-light hover:border-slate-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  Import from Battle.net
                </button>
              )}
              <Link to="/guilds/create" className="inline-flex bg-accent hover:bg-accent-dark text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-glow-purple flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Create Guild Profile
              </Link>
            </div>
          </div>

          {guilds.length === 0 ? (
            <div className="bg-charcoal border border-charcoal-light rounded-2xl p-8 text-center space-y-4">
              <p className="text-slate-400 text-sm">No guilds registered. Create a guild profile to recruit raiders instantly.</p>
              <div className="flex justify-center gap-3">
                {user?.battlenet_id && (
                  <button 
                    onClick={() => { setShowGuildImportModal(true); fetchImportableGuilds(); }}
                    className="bg-charcoal border border-charcoal-light hover:border-slate-400 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                  >
                    Import from Battle.net
                  </button>
                )}
                <Link to="/guilds/create" className="inline-flex bg-accent hover:bg-accent-dark text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-glow-purple">
                  Create Guild Profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {guilds.map(guild => (
                <div key={guild.id} className="bg-charcoal border border-charcoal-light rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 glow-card">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white flex items-center gap-1.5">
                        &lt;{guild.guild_name}&gt;
                        {guild.is_verified && (
                          <span title="Verified guild from Blizzard APIs" className="inline-flex">
                            <ShieldCheck className="h-4.5 w-4.5 text-[#00aeff] drop-shadow-[0_0_5px_rgba(0,174,255,0.5)]" />
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-slate-400">@{guild.realm} ({guild.region})</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-charcoal-dark border border-charcoal-light text-slate-300">
                        {guild.progression_label}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-bold">
                        {guild.recruitment_status}
                      </span>
                    </div>
                  </div>
                  <Link to={`/guilds/edit/${guild.id}`} className="bg-charcoal-dark border border-charcoal-light hover:border-slate-400 text-white p-2 rounded-xl flex items-center justify-center shrink-0">
                    <Edit2 className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Matches & Chats Quick Links */}
      {matches.length > 0 && (
        <div className="bg-charcoal border border-charcoal-light rounded-2xl p-6 space-y-4">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-accent" /> Active Matches & Chat Rooms ({matches.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map(m => (
              <Link 
                key={m.id}
                to={`/matches/${m.id}/messages`}
                className="bg-charcoal-dark border border-charcoal-light hover:border-slate-500 p-4 rounded-xl flex items-center justify-between gap-3 transition-all hover:scale-[1.01] group"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400">
                    {m.player_profile.character_name} <span className="text-[10px] font-normal">@{m.player_profile.realm}</span>
                  </p>
                  <p className="text-sm font-black text-white truncate mt-0.5">
                    &lt;{m.guild_profile.guild_name}&gt;
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-1">
                    {m.guild_profile.progression_label}
                  </p>
                </div>
                <div className="bg-accent/15 group-hover:bg-accent text-accent-light group-hover:text-white p-2 rounded-xl transition-colors">
                  <MessageSquare className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Notifications / Interests Box */}
      {interests.length > 0 && (
        <div className="bg-charcoal border border-charcoal-light rounded-2xl p-6 space-y-4">
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            Incoming Recruitment Offers ({interests.length})
          </h4>
          <div className="divide-y divide-charcoal-light">
            {interests.map(item => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm">
                  <p className="text-slate-200 font-medium">{item.body}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAcceptInterest(item.id)}
                    className="bg-accent hover:bg-accent-dark text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-glow-purple flex items-center gap-1"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button 
                    onClick={() => handleDeclineInterest(item.id)}
                    className="bg-charcoal-dark border border-charcoal-light hover:border-slate-400 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Blizzard Character Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-charcoal border border-charcoal-light w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#00aeff]"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-[#00aeff]">
                    <title>Battle.net</title>
                    <path d="M1.846 0 0 3.333v17.436l1.846 1.795 10.667-6.154V6.154L1.846 0zm10.718 14.256L5.744 18.05V5.949l6.82 3.846v4.461zM4.103 2.82l6.82 3.846v8.205L4.103 11.026V2.82z"/>
                  </svg>
                  Import WoW Characters
                </h3>
                <p className="text-xs text-slate-400 mt-1">Select a character from your Battle.net account to create a verified profile.</p>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 bg-charcoal-dark border border-charcoal-light p-3.5 rounded-xl mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Region:</span>
              <div className="flex gap-2">
                {["us", "eu", "kr", "tw"].map(r => (
                  <button
                    key={r}
                    onClick={() => { setImportRegion(r); fetchBlizzardCharacters(r); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                      importRegion === r 
                        ? "bg-[#00aeff] text-white shadow-[0_0_10px_rgba(0,174,255,0.4)]" 
                        : "bg-charcoal border border-charcoal-light text-slate-400 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 pr-1 min-h-[250px]">
              {importModalLoading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-white">
                  <Clock className="animate-spin h-8 w-8 text-[#00aeff]" />
                  <span className="text-sm text-slate-300">Retrieving characters from Blizzard...</span>
                </div>
              ) : importModalError ? (
                <div className="bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs p-4 rounded-xl text-center">
                  {importModalError}
                </div>
              ) : importingCharacters.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No active characters found in this region for your Battle.net account.
                </div>
              ) : (
                importingCharacters.map(char => {
                  const classColor = getClassColor(char.class_name);
                  return (
                    <div 
                      key={char.id} 
                      className="border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                      style={{
                        background: `linear-gradient(135deg, ${classColor}0A 0%, rgba(20, 20, 20, 0.95) 100%)`,
                        borderColor: `${classColor}22`,
                        boxShadow: `0 4px 20px rgba(0,0,0,0.2), inset 0 0 12px ${classColor}05`
                      }}
                    >
                      <div className="flex items-center gap-3.5 flex-grow">
                        {char.avatar_url ? (
                          <img 
                            src={char.avatar_url} 
                            alt={char.name} 
                            className="h-12 w-12 rounded-xl object-cover border-2 shadow-md shrink-0"
                            style={{ borderColor: classColor }}
                          />
                        ) : (
                          <div 
                            className="h-12 w-12 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0"
                            style={{ borderColor: `${classColor}44`, backgroundColor: `${classColor}11`, color: classColor }}
                          >
                            {char.name ? char.name.substring(0, 2).toUpperCase() : "?"}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-base flex items-center gap-2">
                            <span style={{ color: classColor }}>{char.name}</span>
                            <span className="text-[10px] bg-charcoal border border-charcoal-light text-slate-300 px-1.5 py-0.5 rounded-full font-semibold">Level {char.level}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{char.realm.name}</span>
                            <span className="text-slate-600">&bull;</span>
                            <span style={{ color: classColor }} className="font-semibold">{char.class_name || "WoW Character"}</span>
                          </div>
                        </div>
                      </div>
                    
                    <div className="flex items-center gap-2.5">
                      <select
                        id={`role-${char.id}`}
                        defaultValue="DPS"
                        className="bg-charcoal border border-charcoal-light text-slate-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-accent"
                      >
                        <option value="DPS">DPS</option>
                        <option value="Healer">Healer</option>
                        <option value="Tank">Tank</option>
                      </select>

                      <button
                        onClick={() => {
                          const selRole = (document.getElementById(`role-${char.id}`) as HTMLSelectElement).value
                          handleImportCharacter(char, selRole)
                        }}
                        disabled={importLoadingMap[char.id]}
                        className="bg-accent hover:bg-accent-dark text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 min-w-[70px]"
                      >
                        {importLoadingMap[char.id] ? "Importing..." : "Import"}
                      </button>
                    </div>
                  </div>
                );
              })
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-charcoal-light text-[10px] text-slate-500 flex justify-between items-center shrink-0">
              <span>Requires active wow.profile Blizzard API authorization</span>
              <button 
                onClick={() => fetchBlizzardCharacters(importRegion)} 
                className="text-accent-light hover:text-accent font-bold bg-none border-none outline-none cursor-pointer"
              >
                Refresh List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blizzard Guild Import Modal */}
      {showGuildImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-charcoal border border-charcoal-light w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#00aeff]"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#00aeff]" />
                  Import Guild Profile
                </h3>
                <p className="text-xs text-slate-400 mt-1">Select a guild associated with one of your verified characters to import it.</p>
              </div>
              <button 
                onClick={() => setShowGuildImportModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 pr-1 min-h-[250px]">
              {guildImportLoading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-white">
                  <Clock className="animate-spin h-8 w-8 text-[#00aeff]" />
                  <span className="text-sm text-slate-300">Retrieving guilds from Battle.net...</span>
                </div>
              ) : guildImportError ? (
                <div className="bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs p-4 rounded-xl text-center">
                  {guildImportError}
                </div>
              ) : importingGuilds.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No importable guilds found. Ensure you have imported and verified characters who belong to guilds first.
                </div>
              ) : (
                importingGuilds.map(guild => {
                  const key = `${guild.guild_name}-${guild.guild_id}`;
                  const isAlliance = guild.faction === 'Alliance';
                  return (
                    <div 
                      key={key} 
                      className="bg-charcoal-dark border border-charcoal-light p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-bold text-white text-base flex items-center gap-2">
                          <span>&lt;{guild.guild_name}&gt;</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            isAlliance 
                              ? 'bg-blue-950/40 border border-blue-500/40 text-blue-400' 
                              : 'bg-red-950/40 border border-red-500/40 text-red-400'
                          }`}>
                            {guild.faction}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                          <span>{guild.realm} ({guild.region})</span>
                          <span className="text-slate-600">&bull;</span>
                          <span>Verified via <strong className="text-slate-300">{guild.character_name}</strong> ({guild.rank_name})</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleImportGuild(guild)}
                        disabled={guildImportLoadingMap[key]}
                        className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 min-w-[90px] shrink-0 self-start sm:self-center"
                      >
                        {guildImportLoadingMap[key] ? "Importing..." : "Import Guild"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-charcoal-light text-[10px] text-slate-500 flex justify-between items-center shrink-0">
              <span>Requires ownership of a verified character in the target guild</span>
              <button 
                onClick={fetchImportableGuilds} 
                className="text-accent-light hover:text-accent font-bold bg-none border-none outline-none cursor-pointer"
              >
                Refresh List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
