import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Shield, Filter, Calendar, MapPin, Award, CheckCircle, MessageSquare, Plus, Clock, Users, Send, ShieldCheck } from 'lucide-react'
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
  item_level?: number
  is_verified: boolean
  blizzard_character_id?: number | null
  avatar_url?: string | null
  recruitment_status: string
  goals: string[]
  availability: {
    days: number[]
    start_time: string
    end_time: string
    timezone: string
  }
  transfer_willing: boolean
  faction_change_willing: boolean
  bio?: string
  discord_handle?: string
  battle_tag?: string
}

interface GuildProfile {
  id: number
  guild_name: string
  realm: string
  region: string
  faction: string
  progression_label: string
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const GOAL_OPTIONS = ["Casual", "AOTC", "Mythic", "Cutting Edge", "Mythic+"]
const ROLE_OPTIONS = ["Tank", "Healer", "DPS"]

const BrowsePlayers: React.FC = () => {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  
  const [players, setPlayers] = useState<PlayerProfile[]>([])
  const [myGuilds, setMyGuilds] = useState<GuildProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingInterest, setSubmittingInterest] = useState(false)
  
  // Search & Filter State
  const [className, setClassName] = useState("")
  const [specName, setSpecName] = useState("")
  const [role, setRole] = useState("")
  const [region, setRegion] = useState("")
  const [realm, setRealm] = useState("")
  const [recruitmentStatus, setRecruitmentStatus] = useState("")
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [availabilityDay, setAvailabilityDay] = useState<number | "">("")
  const [timezone, setTimezone] = useState("")
  const [transferWilling, setTransferWilling] = useState<boolean | "">("")
  
  // Modal State for Expressing Interest
  const [interestModalOpen, setInterestModalOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null)
  const [selectedGuildId, setSelectedGuildId] = useState<number | "">("")
  const [interestMessage, setInterestMessage] = useState("")
  const [interestError, setInterestError] = useState<string | null>(null)
  const [interestSuccess, setInterestSuccess] = useState<string | null>(null)

  // Fetch Players based on filters
  const fetchPlayers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (className) params.append("class_name", className)
      if (specName) params.append("spec_name", specName)
      if (role) params.append("role", role)
      if (region) params.append("region", region)
      if (realm) params.append("realm", realm)
      if (recruitmentStatus) params.append("recruitment_status", recruitmentStatus)
      if (selectedGoals.length > 0) params.append("goals", selectedGoals.join(","))
      if (availabilityDay !== "") params.append("availability_day", availabilityDay.toString())
      if (timezone) params.append("timezone", timezone)
      if (transferWilling !== "") params.append("transfer_willing", transferWilling.toString())
      
      const res = await fetch(`/api/players?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPlayers(data)
      }
    } catch (err) {
      console.error("Failed to load players:", err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch user's guild profiles if logged in
  const fetchMyGuilds = async () => {
    if (!token) return
    try {
      const res = await fetch("/api/guilds", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        // Filter guilds owned by current user
        const owned = data.filter((g: any) => g.owner_user_id === user?.id)
        setMyGuilds(owned)
        if (owned.length > 0) {
          setSelectedGuildId(owned[0].id)
        }
      }
    } catch (err) {
      console.error("Error fetching owned guilds:", err)
    }
  }

  useEffect(() => {
    fetchPlayers()
    if (token) {
      fetchMyGuilds()
    }
  }, [token])

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    )
  }

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPlayers()
  }

  const handleResetFilters = () => {
    setClassName("")
    setSpecName("")
    setRole("")
    setRegion("")
    setRealm("")
    setRecruitmentStatus("")
    setSelectedGoals([])
    setAvailabilityDay("")
    setTimezone("")
    setTransferWilling("")
    setTimeout(() => {
      fetchPlayers()
    }, 0)
  }

  const openInterestModal = (player: PlayerProfile) => {
    if (!token) {
      navigate("/login")
      return
    }
    if (myGuilds.length === 0) {
      if (window.confirm("You need a Guild Profile to recruit. Register your guild now?")) {
        navigate("/guilds/create")
      }
      return
    }
    setSelectedPlayer(player)
    setInterestModalOpen(true)
    setInterestError(null)
    setInterestSuccess(null)
  }

  const submitInterest = async () => {
    if (!token || !selectedPlayer || !selectedGuildId) return
    setSubmittingInterest(true)
    setInterestError(null)
    
    try {
      const res = await fetch("/api/interests/guild-to-player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          player_profile_id: selectedPlayer.id,
          guild_profile_id: Number(selectedGuildId),
          message: interestMessage
        })
      })

      if (res.ok) {
        setInterestSuccess("Recruitment interest expressed successfully! Raider has been notified.")
        setInterestMessage("")
        setTimeout(() => {
          setInterestModalOpen(false)
          setSelectedPlayer(null)
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
          <Users className="h-8 w-8 text-accent animate-pulse" /> Recruit World of Warcraft Players
        </h1>
        <p className="text-slate-400 text-sm mt-2">Browse class listings, check schedules, and recruit players with instant double-opt-in matching.</p>
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

          {/* Core class details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Class</label>
              <input 
                type="text"
                placeholder="e.g. Hunter"
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Spec</label>
              <input 
                type="text"
                placeholder="e.g. Beast Mastery"
                value={specName}
                onChange={e => setSpecName(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Role</label>
              <select 
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              >
                <option value="">Any Role</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Recruitment Status</label>
              <select 
                value={recruitmentStatus}
                onChange={e => setRecruitmentStatus(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              >
                <option value="">Any Status</option>
                <option value="LOOKING">Looking For Guild</option>
                <option value="OPEN_TO_OFFERS">Open To Offers</option>
                <option value="NOT_LOOKING">Not Looking</option>
              </select>
            </div>
          </div>

          {/* Availability details */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Available Day</label>
              <select 
                value={availabilityDay}
                onChange={e => setAvailabilityDay(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              >
                <option value="">Any Day</option>
                {DAYS_OF_WEEK.map((day, idx) => (
                  <option key={day} value={idx}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Timezone</label>
              <input 
                type="text"
                placeholder="e.g. EST"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1.5">
              <input
                type="checkbox"
                id="transferWilling"
                checked={transferWilling === true}
                onChange={e => setTransferWilling(e.target.checked ? true : "")}
                className="bg-charcoal accent-accent border-charcoal-light rounded h-4 w-4"
              />
              <label htmlFor="transferWilling" className="text-xs font-bold text-slate-400 cursor-pointer">Transfer Willing Only</label>
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

        {/* Right Side: Players Listings */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="bg-charcoal border border-charcoal-light rounded-2xl p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Clock className="animate-spin h-8 w-8 text-accent" />
              <span className="text-sm">Scanning characters...</span>
            </div>
          ) : players.length === 0 ? (
            <div className="bg-charcoal border border-charcoal-light rounded-2xl p-16 text-center text-slate-400 space-y-4">
              <Users className="h-12 w-12 mx-auto text-charcoal-light" />
              <p className="text-sm">No player characters matching your criteria were found. Adjust filters and try again.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {players.map(player => {
                const classColor = getClassColor(player.class_name);
                return (
                  <div 
                    key={player.id} 
                    className="border rounded-2xl p-6 transition-all flex flex-col md:flex-row md:items-start justify-between gap-6 hover:shadow-[0_4px_25px_rgba(0,0,0,0.4)]"
                    style={{
                      background: `linear-gradient(135deg, ${classColor}0A 0%, rgba(20, 20, 20, 0.95) 100%)`,
                      borderColor: `${classColor}22`,
                      boxShadow: `0 4px 20px rgba(0,0,0,0.2), inset 0 0 12px ${classColor}05`
                    }}
                  >
                    {/* Player details */}
                    <div className="flex items-start gap-4 flex-grow">
                      {player.avatar_url ? (
                        <img 
                          src={player.avatar_url} 
                          alt={player.character_name} 
                          className="h-12 w-12 rounded-xl object-cover border-2 shadow-md shrink-0 mt-1"
                          style={{ borderColor: classColor }}
                        />
                      ) : (
                        <div 
                          className="h-12 w-12 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 mt-1"
                          style={{ borderColor: `${classColor}44`, backgroundColor: `${classColor}11`, color: classColor }}
                        >
                          {player.character_name ? player.character_name.substring(0, 2).toUpperCase() : "?"}
                        </div>
                      )}
                      
                      <div className="space-y-4 flex-grow">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            player.faction === 'Alliance' 
                              ? 'bg-blue-950/40 border border-blue-500/40 text-blue-400' 
                              : player.faction === 'Horde' 
                              ? 'bg-red-950/40 border border-red-500/40 text-red-400' 
                              : 'bg-purple-950/40 border border-purple-500/40 text-purple-400'
                          }`}>
                            {player.faction}
                          </span>
                          <h3 className="text-xl font-black flex items-center gap-1.5" style={{ color: classColor }}>
                            {player.character_name}
                            {player.is_verified && (
                              <span title="Verified character from Blizzard APIs" className="inline-flex">
                                <ShieldCheck className="h-4.5 w-4.5 text-[#00aeff] drop-shadow-[0_0_5px_rgba(0,174,255,0.5)]" />
                              </span>
                            )}
                          </h3>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {player.realm} ({player.region})
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <span className="px-2 py-0.5 rounded bg-charcoal-dark border border-charcoal-light font-semibold" style={{ color: classColor }}>
                            {player.spec_name} {player.class_name}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-charcoal-dark border border-charcoal-light text-slate-300">
                            {player.role}
                          </span>
                          
                          {player.item_level && (
                            <span className="text-slate-300 font-bold">
                              ilvl {player.item_level}
                            </span>
                          )}
                          
                          <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-bold text-[10px]">
                            {player.recruitment_status}
                          </span>

                          {/* Availability */}
                          {player.availability?.days && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {player.availability.days.map(d => DAYS_OF_WEEK[d].substring(0, 3)).join(", ")} @ {player.availability.start_time}-{player.availability.end_time} {player.availability.timezone}
                              </span>
                            </div>
                          )}
                        </div>

                        {player.bio && (
                          <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl">{player.bio}</p>
                        )}

                        {/* Transfers, Faction change and Goals */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Raid Goals:</span>
                            {player.goals?.map(g => (
                              <span key={g} className="bg-charcoal-dark px-2.5 py-0.5 rounded text-[10px] text-slate-300 border border-charcoal-light">
                                {g}
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-3 text-[10px] font-bold text-slate-400">
                            <span>Transfer: <strong className={player.transfer_willing ? "text-emerald-400" : "text-slate-500"}>{player.transfer_willing ? "Willing" : "No"}</strong></span>
                            <span>Faction Change: <strong className={player.faction_change_willing ? "text-emerald-400" : "text-slate-500"}>{player.faction_change_willing ? "Willing" : "No"}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions column */}
                    <div className="flex md:flex-col items-stretch justify-center gap-2 shrink-0 md:w-36">
                      <button
                        onClick={() => openInterestModal(player)}
                        className="flex-grow bg-accent hover:bg-accent-dark text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-glow-purple flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Send className="h-3.5 w-3.5" /> Recruit Raider
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Express Interest Modal popup */}
      {interestModalOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal border border-charcoal-light rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-charcoal-light pb-3">
              <h3 className="text-lg font-black text-white">Recruit {selectedPlayer.character_name}</h3>
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Select Your Guild Listing</label>
                <select
                  value={selectedGuildId}
                  onChange={e => setSelectedGuildId(Number(e.target.value))}
                  className="w-full bg-charcoal-dark border border-charcoal-light px-3 py-2.5 rounded-xl text-xs text-white focus:border-accent focus:outline-none"
                >
                  {myGuilds.map(g => (
                    <option key={g.id} value={g.id}>
                      &lt;{g.guild_name}&gt; - {g.progression_label} @{g.realm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Recruitment Offer Message (Optional)</label>
                <textarea
                  value={interestMessage}
                  onChange={e => setInterestMessage(e.target.value)}
                  placeholder="Hey, we are currently recruiting for our mythic progression team. Your logs and raid schedules match ours perfectly! Let's talk."
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
                {submittingInterest ? "Sending..." : "Send Offer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BrowsePlayers
