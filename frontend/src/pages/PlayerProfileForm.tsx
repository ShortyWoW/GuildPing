import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sparkles, ArrowLeft, Clock } from 'lucide-react'
import { useAuth } from '../App'

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const GOAL_OPTIONS = ["Casual", "AOTC", "Mythic", "Cutting Edge", "Mythic+"]

const PlayerProfileForm: React.FC = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [characterName, setCharacterName] = useState("")
  const [realm, setRealm] = useState("")
  const [region, setRegion] = useState("US")
  const [faction, setFaction] = useState("Alliance")
  const [className, setClassName] = useState("")
  const [specName, setSpecName] = useState("")
  const [role, setRole] = useState("DPS")
  const [itemLevel, setItemLevel] = useState<number | "">("")
  const [recruitmentStatus, setRecruitmentStatus] = useState("LOOKING")
  const [goals, setGoals] = useState<string[]>([])
  
  // Availability
  const [availDays, setAvailDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState("19:00")
  const [endTime, setEndTime] = useState("22:00")
  const [timezone, setTimezone] = useState("EST")
  
  const [transferWilling, setTransferWilling] = useState(false)
  const [factionWilling, setFactionWilling] = useState(false)
  const [bio, setBio] = useState("")
  const [discordHandle, setDiscordHandle] = useState("")
  const [battleTag, setBattleTag] = useState("")
  const [visibility, setVisibility] = useState("PUBLIC")
  
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      navigate("/login")
      return
    }

    if (id) {
      const fetchProfile = async () => {
        setFetching(true)
        try {
          const res = await fetch(`/api/players/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const data = await res.json()
            setCharacterName(data.character_name)
            setRealm(data.realm)
            setRegion(data.region)
            setFaction(data.faction)
            setClassName(data.class_name)
            setSpecName(data.spec_name)
            setRole(data.role)
            setItemLevel(data.item_level || "")
            setRecruitmentStatus(data.recruitment_status)
            setGoals(data.goals)
            
            // Availability
            setAvailDays(data.availability?.days || [])
            setStartTime(data.availability?.start_time || "19:00")
            setEndTime(data.availability?.end_time || "22:00")
            setTimezone(data.availability?.timezone || "EST")
            
            setTransferWilling(data.transfer_willing)
            setFactionWilling(data.faction_change_willing)
            setBio(data.bio || "")
            setDiscordHandle(data.discord_handle || "")
            setBattleTag(data.battle_tag || "")
            setVisibility(data.visibility)
          }
        } catch (err) {
          console.error("Failed to load player profile:", err)
        } finally {
          setFetching(false)
        }
      }
      fetchProfile()
    }
  }, [id, token])

  const handleGoalToggle = (goal: string) => {
    setGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    )
  }

  const handleDayToggle = (dayIdx: number) => {
    setAvailDays(prev =>
      prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const payload = {
      character_name: characterName,
      realm,
      region,
      faction,
      class_name: className,
      spec_name: specName,
      role,
      item_level: itemLevel === "" ? null : Number(itemLevel),
      recruitment_status: recruitmentStatus,
      goals,
      availability: {
        days: availDays,
        start_time: startTime,
        end_time: endTime,
        timezone
      },
      transfer_willing: transferWilling,
      faction_change_willing: factionWilling,
      bio,
      discord_handle: discordHandle || null,
      battle_tag: battleTag || null,
      visibility
    }

    try {
      const url = id ? `/api/players/${id}` : "/api/players"
      const method = id ? "PUT" : "POST"
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        navigate("/dashboard")
      } else {
        const data = await res.json()
        setError(data.detail || "Failed to save profile. Verify details.")
      }
    } catch {
      setError("Server connection failed. Try again later.")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex-grow flex items-center justify-center bg-charcoal-dark text-white">
        <div className="animate-pulse flex items-center gap-2">
          <Clock className="animate-spin h-5 w-5 text-accent" />
          <span>Fetching character details...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-charcoal-dark min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")} className="bg-charcoal border border-charcoal-light text-slate-400 hover:text-white p-2.5 rounded-xl transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-3xl font-black text-white">{id ? "Edit Character Profile" : "List Your WoW Character"}</h1>
      </div>

      {error && (
        <div className="bg-rose-900/30 border border-rose-500/40 text-rose-200 text-xs px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-charcoal border border-charcoal-light p-8 rounded-2xl shadow-2xl space-y-8">
        {/* Core details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Character Name</label>
            <input
              type="text"
              required
              value={characterName}
              onChange={e => setCharacterName(e.target.value)}
              placeholder="Sylvana"
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Realm / Server</label>
            <input
              type="text"
              required
              value={realm}
              onChange={e => setRealm(e.target.value)}
              placeholder="Illidan"
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Region</label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            >
              <option value="US">US</option>
              <option value="EU">EU</option>
              <option value="KR">KR</option>
              <option value="TW">TW</option>
            </select>
          </div>
        </div>

        {/* Faction Class Spec */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Faction</label>
            <select
              value={faction}
              onChange={e => setFaction(e.target.value)}
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            >
              <option value="Alliance">Alliance</option>
              <option value="Horde">Horde</option>
              <option value="Cross-Faction">Cross-Faction</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Class</label>
            <input
              type="text"
              required
              value={className}
              onChange={e => setClassName(e.target.value)}
              placeholder="Hunter"
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Spec</label>
            <input
              type="text"
              required
              value={specName}
              onChange={e => setSpecName(e.target.value)}
              placeholder="Marksmanship"
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            >
              <option value="DPS">DPS</option>
              <option value="Healer">Healer</option>
              <option value="Tank">Tank</option>
            </select>
          </div>
        </div>

        {/* Item Level and Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Item Level</label>
            <input
              type="number"
              value={itemLevel}
              onChange={e => setItemLevel(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="525"
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Recruitment Status</label>
            <select
              value={recruitmentStatus}
              onChange={e => setRecruitmentStatus(e.target.value)}
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            >
              <option value="LOOKING">Looking for Guild (Active)</option>
              <option value="OPEN_TO_OFFERS">Open to Offers (Selective)</option>
              <option value="NOT_LOOKING">Not Looking (Closed)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Visibility</label>
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value)}
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            >
              <option value="PUBLIC">Public (Searchable)</option>
              <option value="UNLISTED">Unlisted (Link only)</option>
              <option value="PRIVATE">Private (Match only)</option>
            </select>
          </div>
        </div>

        {/* Goals Checklist */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Recruitment Goals</label>
          <div className="flex flex-wrap gap-3">
            {GOAL_OPTIONS.map(goal => {
              const active = goals.includes(goal)
              return (
                <button
                  type="button"
                  key={goal}
                  onClick={() => handleGoalToggle(goal)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    active 
                      ? 'bg-accent/20 border-accent text-accent-light shadow-glow-purple' 
                      : 'bg-charcoal-dark border-charcoal-light text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {goal}
                </button>
              )
            })}
          </div>
        </div>

        {/* Availability */}
        <div className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Weekly Availability</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day, idx) => {
              const active = availDays.includes(idx)
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleDayToggle(idx)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    active 
                      ? 'bg-accent/20 border-accent text-accent-light' 
                      : 'bg-charcoal-dark border-charcoal-light text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {day.substring(0, 3)}
                </button>
              )
            })}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Time</label>
              <input
                type="text"
                required
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                placeholder="19:00"
                className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">End Time</label>
              <input
                type="text"
                required
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                placeholder="22:00"
                className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Timezone</label>
              <input
                type="text"
                required
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                placeholder="EST"
                className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Willingness Checkboxes */}
        <div className="flex flex-col sm:flex-row gap-6 bg-charcoal-dark p-4 rounded-xl border border-charcoal-light">
          <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={transferWilling}
              onChange={e => setTransferWilling(e.target.checked)}
              className="h-4 w-4 bg-charcoal accent-accent border-charcoal-light rounded"
            />
            Willing to Server Transfer
          </label>
          <label className="flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-300">
            <input
              type="checkbox"
              checked={factionWilling}
              onChange={e => setFactionWilling(e.target.checked)}
              className="h-4 w-4 bg-charcoal accent-accent border-charcoal-light rounded"
            />
            Willing to Faction Change
          </label>
        </div>

        {/* Discord and Battletag info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Discord Handle</label>
            <input
              type="text"
              value={discordHandle}
              onChange={e => setDiscordHandle(e.target.value)}
              placeholder="sylvanas_windrunner"
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">BattleTag</label>
            <input
              type="text"
              value={battleTag}
              onChange={e => setBattleTag(e.target.value)}
              placeholder="Sylvanas#1234"
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Bio / Log Summary</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={4}
            placeholder="Looking for CE focused guild. Finished 8/8H, 4/8M current tier. Have logs available."
            className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none resize-none"
          />
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-dark text-white py-4 rounded-xl font-bold hover:scale-[1.01] active:scale-[0.99] transition-all shadow-glow-purple flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" /> {loading ? "Saving Character Listing..." : "Save Character Profile"}
        </button>
      </form>
    </div>
  )
}

export default PlayerProfileForm
