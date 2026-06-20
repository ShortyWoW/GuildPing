import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Shield, Filter, Calendar, MapPin, Award, CheckCircle, MessageSquare, Plus, Clock, Users, Send, ShieldCheck } from 'lucide-react'
import { useAuth } from '../App'

interface GuildProfile {
  id: number
  guild_name: string
  realm: string
  region: string
  faction: string
  recruitment_status: string
  progression_label: string
  is_verified?: boolean
  goals: string[]
  raid_schedule: {
    days: number[]
    start_time: string
    end_time: string
    timezone: string
  }
  needs: {
    roles: string[]
    classes: string[]
  }
  description?: string
  discord_invite?: string
  website_url?: string
}

interface PlayerProfile {
  id: number
  character_name: string
  realm: string
  region: string
  class_name: string
  spec_name: string
  role: string
  is_verified: boolean
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const GOAL_OPTIONS = ["Casual", "AOTC", "Mythic", "Cutting Edge", "Mythic+"]
const ROLE_OPTIONS = ["Tank", "Healer", "DPS"]

const BrowseGuilds: React.FC = () => {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  
  const [guilds, setGuilds] = useState<GuildProfile[]>([])
  const [myPlayers, setMyPlayers] = useState<PlayerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingInterest, setSubmittingInterest] = useState(false)
  
  // Search & Filter State
  const [region, setRegion] = useState("")
  const [realm, setRealm] = useState("")
  const [faction, setFaction] = useState("")
  const [recruitmentStatus, setRecruitmentStatus] = useState("")
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [raidDay, setRaidDay] = useState<number | "">("")
  const [roleNeed, setRoleNeed] = useState("")
  const [classNeed, setClassNeed] = useState("")
  
  // Modal State for Expressing Interest
  const [interestModalOpen, setInterestModalOpen] = useState(false)
  const [selectedGuild, setSelectedGuild] = useState<GuildProfile | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | "">("")
  const [interestMessage, setInterestMessage] = useState("")
  const [interestError, setInterestError] = useState<string | null>(null)
  const [interestSuccess, setInterestSuccess] = useState<string | null>(null)

  // Fetch Guilds based on filters
  const fetchGuilds = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (region) params.append("region", region)
      if (realm) params.append("realm", realm)
      if (faction) params.append("faction", faction)
      if (recruitmentStatus) params.append("recruitment_status", recruitmentStatus)
      if (selectedGoals.length > 0) params.append("goals", selectedGoals.join(","))
      if (raidDay !== "") params.append("raid_day", raidDay.toString())
      if (roleNeed) params.append("role_need", roleNeed)
      if (classNeed) params.append("class_need", classNeed)
      
      const res = await fetch(`/api/guilds?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setGuilds(data)
      }
    } catch (err) {
      console.error("Failed to load guilds:", err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch user's player profiles if logged in
  const fetchMyPlayers = async () => {
    if (!token) return
    try {
      const res = await fetch("/api/players", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        // Filter players owned by the current user
        const owned = data.filter((p: any) => p.user_id === user?.id)
        setMyPlayers(owned)
        if (owned.length > 0) {
          setSelectedPlayerId(owned[0].id)
        }
      }
    } catch (err) {
      console.error("Error fetching owned players:", err)
    }
  }

  useEffect(() => {
    fetchGuilds()
    if (token) {
      fetchMyPlayers()
    }
  }, [token])

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    )
  }

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    fetchGuilds()
  }

  const handleResetFilters = () => {
    setRegion("")
    setRealm("")
    setFaction("")
    setRecruitmentStatus("")
    setSelectedGoals([])
    setRaidDay("")
    setRoleNeed("")
    setClassNeed("")
    // Trigger fetch on reset
    setTimeout(() => {
      fetchGuilds()
    }, 0)
  }

  const openInterestModal = (guild: GuildProfile) => {
    if (!token) {
      navigate("/login")
      return
    }
    if (myPlayers.length === 0) {
      // Must create profile first
      if (window.confirm("You need a Player Character Profile to apply. Create one now?")) {
        navigate("/players/create")
      }
      return
    }
    setSelectedGuild(guild)
    setInterestModalOpen(true)
    setInterestError(null)
    setInterestSuccess(null)
  }

  const submitInterest = async () => {
    if (!token || !selectedGuild || !selectedPlayerId) return
    setSubmittingInterest(true)
    setInterestError(null)
    
    try {
      const res = await fetch("/api/interests/player-to-guild", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          player_profile_id: Number(selectedPlayerId),
          guild_profile_id: selectedGuild.id,
          message: interestMessage
        })
      })

      if (res.ok) {
        setInterestSuccess("Interest expressed successfully! Recruiters have been notified.")
        setInterestMessage("")
        setTimeout(() => {
          setInterestModalOpen(false)
          setSelectedGuild(null)
          setInterestSuccess(null)
        }, 2000)
      } else {
        const data = await res.json()
        setInterestError(data.detail || "Failed to express interest.")
      }
    } catch {
      setInterestError("Connection error. Try again.")
    } finally {
      setSubmittingInterest(false)
    }
  }

  return (
    <div className="bg-charcoal-dark min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-glow-purple text-white flex items-center gap-2.5">
          <Shield className="h-8 w-8 text-accent animate-pulse" /> Find World of Warcraft Guilds
        </h1>
        <p className="text-slate-400 text-sm mt-2">Connect instantly with teams looking for your class, spec, and raid schedule.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left Side: Filter Form Panel */}
        <form onSubmit={handleApplyFilters} className="bg-charcoal border border-charcoal-light rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-charcoal-light pb-3">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
              <Filter className="h-4 w-4 text-accent" /> Search Filters
            </h4>
            <button 
              type="button" 
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-accent font-semibold"
            >
              Reset All
            </button>
          </div>

          {/* Region & Realm */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Region</label>
              <select 
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              >
                <option value="">Any Region</option>
                <option value="US">US</option>
                <option value="EU">EU</option>
                <option value="KR">KR</option>
                <option value="TW">TW</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Realm / Server</label>
              <input 
                type="text"
                placeholder="e.g. Illidan"
                value={realm}
                onChange={e => setRealm(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Faction</label>
              <select 
                value={faction}
                onChange={e => setFaction(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              >
                <option value="">Any Faction</option>
                <option value="Alliance">Alliance</option>
                <option value="Horde">Horde</option>
                <option value="Cross-Faction">Cross-Faction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Status</label>
              <select 
                value={recruitmentStatus}
                onChange={e => setRecruitmentStatus(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              >
                <option value="">Any Status</option>
                <option value="RECRUITING">Recruiting</option>
                <option value="SELECTIVE">Selective</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Raid Schedule Day</label>
              <select 
                value={raidDay}
                onChange={e => setRaidDay(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              >
                <option value="">Any Day</option>
                {DAYS_OF_WEEK.map((day, idx) => (
                  <option key={day} value={idx}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Needed Role</label>
              <select 
                value={roleNeed}
                onChange={e => setRoleNeed(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              >
                <option value="">Any Role</option>
                {ROLE_OPTIONS.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Needed Class</label>
              <input 
                type="text"
                placeholder="e.g. Priest"
                value={classNeed}
                onChange={e => setClassNeed(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Goals */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Goals</label>
            <div className="flex flex-wrap gap-1.5">
              {GOAL_OPTIONS.map(goal => {
                const active = selectedGoals.includes(goal)
                return (
                  <button
                    type="button"
                    key={goal}
                    onClick={() => handleGoalToggle(goal)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                      active 
                        ? 'bg-accent/25 border-accent text-accent-light' 
                        : 'bg-charcoal-dark border-charcoal-light text-slate-400 hover:border-slate-400'
                    }`}
                  >
                    {goal}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-accent hover:bg-accent-dark text-white text-xs font-bold py-3 rounded-xl transition-all shadow-glow-purple flex items-center justify-center gap-1.5"
          >
            <Search className="h-4 w-4" /> Apply Filters
          </button>
        </form>

        {/* Right Side: Guilds Listings */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="bg-charcoal border border-charcoal-light rounded-2xl p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Clock className="animate-spin h-8 w-8 text-accent" />
              <span className="text-sm">Fetching guild rosters...</span>
            </div>
          ) : guilds.length === 0 ? (
            <div className="bg-charcoal border border-charcoal-light rounded-2xl p-16 text-center text-slate-400 space-y-4">
              <Shield className="h-12 w-12 mx-auto text-charcoal-light" />
              <p className="text-sm">No guilds matching your criteria were found. Adjust filters and try again.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {guilds.map(guild => (
                <div key={guild.id} className="bg-charcoal border border-charcoal-light rounded-2xl p-6 hover:border-charcoal-light transition-all flex flex-col md:flex-row md:items-start justify-between gap-6 glow-card">
                  {/* Guild details */}
                  <div className="space-y-4 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        guild.faction === 'Alliance' 
                          ? 'bg-blue-950/40 border border-blue-500/40 text-blue-400' 
                          : guild.faction === 'Horde' 
                          ? 'bg-red-950/40 border border-red-500/40 text-red-400' 
                          : 'bg-purple-950/40 border border-purple-500/40 text-purple-400'
                      }`}>
                        {guild.faction}
                      </span>
                      <h3 className="text-xl font-black text-white flex items-center gap-1.5">
                        &lt;{guild.guild_name}&gt;
                        {guild.is_verified && (
                          <span title="Verified guild from Blizzard APIs" className="inline-flex">
                            <ShieldCheck className="h-4.5 w-4.5 text-[#00aeff] drop-shadow-[0_0_5px_rgba(0,174,255,0.5)]" />
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {guild.realm} ({guild.region})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Award className="h-4 w-4 text-amber-500" />
                        <span className="font-semibold">{guild.progression_label}</span>
                      </div>
                      
                      {guild.recruitment_status === "RECRUITING" ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-bold text-[10px]">
                          {guild.recruitment_status}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/40 text-amber-400 font-bold text-[10px]">
                          {guild.recruitment_status}
                        </span>
                      )}

                      {/* Raid days & time */}
                      {guild.raid_schedule?.days && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {guild.raid_schedule.days.map(d => DAYS_OF_WEEK[d].substring(0, 3)).join(", ")} @ {guild.raid_schedule.start_time}-{guild.raid_schedule.end_time} {guild.raid_schedule.timezone}
                          </span>
                        </div>
                      )}
                    </div>

                    {guild.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">{guild.description}</p>
                    )}

                    {/* Needs and Goals */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Raid Goals:</span>
                        {guild.goals?.map(g => (
                          <span key={g} className="bg-charcoal-dark px-2.5 py-0.5 rounded text-[10px] text-slate-300 border border-charcoal-light">
                            {g}
                          </span>
                        ))}
                      </div>

                      {((guild.needs?.roles?.length || 0) > 0 || (guild.needs?.classes?.length || 0) > 0) && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Recruiting:</span>
                          {guild.needs?.roles?.map(r => (
                            <span key={r} className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                              {r}
                            </span>
                          ))}
                          {guild.needs?.classes?.map(c => (
                            <span key={c} className="bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-bold">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex md:flex-col items-stretch justify-center gap-2 shrink-0 md:w-36">
                    <button
                      onClick={() => openInterestModal(guild)}
                      className="flex-grow bg-accent hover:bg-accent-dark text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-glow-purple flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Send className="h-3.5 w-3.5" /> Express Interest
                    </button>
                    {guild.discord_invite && (
                      <a
                        href={guild.discord_invite}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-charcoal-dark border border-charcoal-light hover:border-slate-400 text-slate-300 hover:text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        Discord
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Express Interest Modal popup */}
      {interestModalOpen && selectedGuild && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal border border-charcoal-light rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-charcoal-light pb-3">
              <h3 className="text-lg font-black text-white">Express Interest in &lt;{selectedGuild.guild_name}&gt;</h3>
              <button 
                onClick={() => setInterestModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                &times;
              </button>
            </div>

            {interestError && (
              <div className="bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs px-4 py-2.5 rounded-xl">
                {interestError}
              </div>
            )}

            {interestSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2.5 rounded-xl">
                {interestSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Select Your Character</label>
                <select
                  value={selectedPlayerId}
                  onChange={e => setSelectedPlayerId(Number(e.target.value))}
                  className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
                >
                  {myPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.character_name} - {p.spec_name} {p.class_name} ({p.role}) @{p.realm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Intro Message (Optional)</label>
                <textarea
                  value={interestMessage}
                  onChange={e => setInterestMessage(e.target.value)}
                  placeholder="Hey, saw your recruitment needs! I'm a veteran raider looking for a permanent spot."
                  rows={4}
                  className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setInterestModalOpen(false)}
                className="bg-charcoal-dark border border-charcoal-light hover:border-slate-400 text-white text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={submitInterest}
                disabled={submittingInterest}
                className="bg-accent hover:bg-accent-dark text-white text-xs font-bold px-4 py-2 rounded-xl shadow-glow-purple flex items-center gap-1.5"
              >
                {submittingInterest ? "Sending..." : "Send Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrowseGuilds
