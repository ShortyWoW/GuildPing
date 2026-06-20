import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sparkles, ArrowLeft, Clock, Shield } from 'lucide-react'
import { useAuth } from '../App'

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const GOAL_OPTIONS = ["Casual", "AOTC", "Mythic", "Cutting Edge", "Mythic+"]
const ROLE_OPTIONS = ["Tank", "Healer", "DPS"]
const CLASS_OPTIONS = ["Death Knight", "Demon Hunter", "Druid", "Evoker", "Hunter", "Mage", "Monk", "Paladin", "Priest", "Rogue", "Shaman", "Warlock", "Warrior"]

const GuildProfileForm: React.FC = () => {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [guildName, setGuildName] = useState("")
  const [realm, setRealm] = useState("")
  const [region, setRegion] = useState("US")
  const [faction, setFaction] = useState("Alliance")
  const [recruitmentStatus, setRecruitmentStatus] = useState("RECRUITING")
  const [progressionLabel, setProgressionLabel] = useState("")
  const [goals, setGoals] = useState<string[]>([])
  
  // Raid Schedule
  const [raidDays, setRaidDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState("20:00")
  const [endTime, setEndTime] = useState("23:00")
  const [timezone, setTimezone] = useState("EST")
  
  // Needs
  const [rolesNeeded, setRolesNeeded] = useState<string[]>([])
  const [classesNeeded, setClassesNeeded] = useState<string[]>([])
  
  const [description, setDescription] = useState("")
  const [discordInvite, setDiscordInvite] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("")
  const [showWebhook, setShowWebhook] = useState(false)
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
          const res = await fetch(`/api/guilds/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const data = await res.json()
            setGuildName(data.guild_name)
            setRealm(data.realm)
            setRegion(data.region)
            setFaction(data.faction)
            setRecruitmentStatus(data.recruitment_status)
            setProgressionLabel(data.progression_label)
            setGoals(data.goals)
            
            // Raid Schedule
            setRaidDays(data.raid_schedule?.days || [])
            setStartTime(data.raid_schedule?.start_time || "20:00")
            setEndTime(data.raid_schedule?.end_time || "23:00")
            setTimezone(data.raid_schedule?.timezone || "EST")
            
            // Needs
            setRolesNeeded(data.needs?.roles || [])
            setClassesNeeded(data.needs?.classes || [])
            
            setDescription(data.description || "")
            setDiscordInvite(data.discord_invite || "")
            setWebsiteUrl(data.website_url || "")
            setDiscordWebhookUrl(data.discord_webhook_url || "")
            setVisibility(data.visibility)
          }
        } catch (err) {
          console.error("Failed to load guild profile:", err)
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
    setRaidDays(prev =>
      prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx]
    )
  }

  const handleRoleToggle = (role: string) => {
    setRolesNeeded(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const handleClassToggle = (cls: string) => {
    setClassesNeeded(prev =>
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const payload = {
      guild_name: guildName,
      realm,
      region,
      faction,
      recruitment_status: recruitmentStatus,
      progression_label: progressionLabel,
      goals,
      raid_schedule: {
        days: raidDays,
        start_time: startTime,
        end_time: endTime,
        timezone
      },
      needs: {
        roles: rolesNeeded,
        classes: classesNeeded
      },
      description,
      discord_invite: discordInvite || null,
      website_url: websiteUrl || null,
      discord_webhook_url: discordWebhookUrl || null,
      visibility
    }

    try {
      const url = id ? `/api/guilds/${id}` : "/api/guilds"
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
        setError(data.detail || "Failed to save guild profile. Verify details.")
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
          <span>Fetching guild details...</span>
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
        <h1 className="text-3xl font-black text-white">{id ? "Edit Guild Profile" : "Register a Guild Profile"}</h1>
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Guild Name</label>
            <input
              type="text"
              required
              value={guildName}
              onChange={e => setGuildName(e.target.value)}
              placeholder="Shadow Council"
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
              placeholder="Area 52"
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

        {/* Faction and Progression */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Faction</label>
            <select
              value={faction}
              onChange={e => setFaction(e.target.value)}
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            >
              <option value="Alliance">Alliance</option>
              <option value="Horde">Horde</option>
              <option value="Cross-Faction">Cross-Faction / Either</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Progression Level</label>
            <input
              type="text"
              required
              value={progressionLabel}
              onChange={e => setProgressionLabel(e.target.value)}
              placeholder="8/8H, 4/8M, CE-focused"
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
              <option value="RECRUITING">Recruiting (Open)</option>
              <option value="SELECTIVE">Selective (Specific Needs)</option>
              <option value="CLOSED">Recruitment Closed</option>
            </select>
          </div>
        </div>

        {/* Goals Checklist */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Guild Focus & Goals</label>
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

        {/* Raid Schedule */}
        <div className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Raid Schedule</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day, idx) => {
              const active = raidDays.includes(idx)
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
                placeholder="20:00"
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
                placeholder="23:00"
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

        {/* Roles Needed */}
        <div className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Recruitment Needs: Roles</label>
          <div className="flex flex-wrap gap-3">
            {ROLE_OPTIONS.map(role => {
              const active = rolesNeeded.includes(role)
              return (
                <button
                  type="button"
                  key={role}
                  onClick={() => handleRoleToggle(role)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    active 
                      ? 'bg-accent/20 border-accent text-accent-light' 
                      : 'bg-charcoal-dark border-charcoal-light text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {role}
                </button>
              )
            })}
          </div>
        </div>

        {/* Classes Needed */}
        <div className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Recruitment Needs: Classes</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CLASS_OPTIONS.map(cls => {
              const active = classesNeeded.includes(cls)
              return (
                <button
                  type="button"
                  key={cls}
                  onClick={() => handleClassToggle(cls)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                    active 
                      ? 'bg-accent/20 border-accent text-accent-light shadow-glow-purple' 
                      : 'bg-charcoal-dark border-charcoal-light text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {cls}
                </button>
              )
            })}
          </div>
        </div>

        {/* Discord and Visibility */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Discord Invite Link</label>
            <input
              type="text"
              value={discordInvite}
              onChange={e => setDiscordInvite(e.target.value)}
              placeholder="https://discord.gg/your_guild"
              className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
            />
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

        {/* Website Link */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Website URL</label>
          <input
            type="text"
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            placeholder="https://guildping.com"
            className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
          />
        </div>

        {/* Discord Webhook Integration */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Discord Webhook URL (Application Notifications)</span>
            <button
              type="button"
              onClick={() => setShowWebhook(!showWebhook)}
              className="text-[10px] text-accent-light hover:text-accent font-bold uppercase tracking-wider"
            >
              {showWebhook ? "Hide Link" : "Show Link"}
            </button>
          </label>
          <input
            type={showWebhook ? "text" : "password"}
            value={discordWebhookUrl}
            onChange={e => setDiscordWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Incoming application interest/messages will be pushed directly to this Discord channel.
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Guild Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="We are an active raiding guild focusing on Mythic progression. Looking for dedicated raiders to complete our core team."
            className="w-full bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none resize-none"
          />
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-dark text-white py-4 rounded-xl font-bold hover:scale-[1.01] active:scale-[0.99] transition-all shadow-glow-purple flex items-center justify-center gap-2"
        >
          <Shield className="h-4 w-4" /> {loading ? "Saving Guild Listing..." : "Save Guild Profile"}
        </button>
      </form>
    </div>
  )
}

export default GuildProfileForm
