import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Send, ArrowLeft, Clock, Shield, User, RefreshCw, MessageSquare, AlertCircle } from 'lucide-react'
import { useAuth } from '../App'

interface Message {
  id: number
  match_id: number
  sender_user_id: number
  body: string
  created_at: string
  read_at?: string
}

interface PlayerProfile {
  id: number
  user_id: number
  character_name: string
  realm: string
  region: string
  class_name: string
  spec_name: string
  role: string
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

const MatchMessages: React.FC = () => {
  const { token, user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  
  const [match, setMatch] = useState<Match | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch match details from list of all matches
  const fetchMatchDetails = async () => {
    if (!token || !id) return
    try {
      const res = await fetch("/api/matches", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const matchesList: Match[] = await res.json()
        const targetMatch = matchesList.find(m => m.id === Number(id))
        if (targetMatch) {
          setMatch(targetMatch)
        } else {
          setError("Match not found or unauthorized access.")
        }
      }
    } catch (err) {
      console.error("Error fetching match details:", err)
    }
  }

  // Fetch chat messages
  const fetchMessages = async (showLoading = false) => {
    if (!token || !id) return
    if (showLoading) setLoading(true)
    try {
      const res = await fetch(`/api/matches/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      } else {
        setError("Could not load messages.")
      }
    } catch {
      setError("Failed to connect to chat API.")
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Setup initial fetch and polling interval
  useEffect(() => {
    if (!token) {
      navigate("/login")
      return
    }

    fetchMatchDetails()
    fetchMessages(true)

    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages(false)
    }, 3000)

    // Listen to custom WebSocket message event if dispatched
    const handleWSMessage = (e: Event) => {
      const customEvent = e as CustomEvent
      const payload = customEvent.detail?.payload
      if (payload && Number(payload.match_id) === Number(id)) {
        fetchMessages(false)
      }
    }

    window.addEventListener("gp_ws_notification", handleWSMessage)

    return () => {
      clearInterval(interval)
      window.removeEventListener("gp_ws_notification", handleWSMessage)
    }
  }, [id, token])

  // Scroll to bottom whenever messages list change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !newMessage.trim() || !id) return
    setSending(true)
    
    const messageBody = newMessage
    setNewMessage("") // Optmistic clear

    try {
      const res = await fetch(`/api/matches/${id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ body: messageBody })
      })

      if (res.ok) {
        const sentMsg = await res.json()
        setMessages(prev => [...prev, sentMsg])
      } else {
        console.error("Failed to send message")
      }
    } catch (err) {
      console.error("Message send error:", err)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div class="flex-grow flex items-center justify-center bg-charcoal-dark text-white">
        <div class="animate-pulse flex items-center gap-2">
          <Clock class="animate-spin h-5 w-5 text-accent" />
          <span>Opening secure comms channel...</span>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div class="flex-grow flex flex-col items-center justify-center bg-charcoal-dark text-white p-6 space-y-4">
        <AlertCircle class="h-10 w-10 text-rose-500" />
        <h3 class="text-lg font-bold">Access Denied</h3>
        <p class="text-xs text-slate-400 max-w-sm text-center">{error || "You are not a member of this recruitment match."}</p>
        <Link to="/matches" class="bg-charcoal border border-charcoal-light px-4 py-2 rounded-xl text-xs font-bold text-white">
          Back to Matches
        </Link>
      </div>
    )
  }

  const isUserPlayer = match.player_profile.user_id === user?.id
  const otherPartyName = isUserPlayer ? `<${match.guild_profile.guild_name}> Recruiter` : `${match.player_profile.character_name} (${match.player_profile.spec_name} ${match.player_profile.class_name})`

  return (
    <div class="bg-charcoal-dark flex-grow flex flex-col min-h-[calc(100vh-4rem)] max-w-5xl mx-auto w-full border-x border-charcoal-light">
      {/* Top Header */}
      <div class="bg-charcoal border-b border-charcoal-light p-4 flex items-center justify-between sticky top-16 z-30">
        <div class="flex items-center gap-3">
          <button onClick={() => navigate("/matches")} class="bg-charcoal-dark border border-charcoal-light text-slate-400 hover:text-white p-2 rounded-xl transition-colors">
            <ArrowLeft class="h-4 w-4" />
          </button>
          
          <div>
            <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
              {isUserPlayer ? (
                <>
                  <Shield class="h-4 w-4 text-accent" /> &lt;{match.guild_profile.guild_name}&gt;
                </>
              ) : (
                <>
                  <User class="h-4 w-4 text-accent" /> {match.player_profile.character_name}
                </>
              )}
            </h3>
            <p class="text-[10px] text-slate-400">
              {isUserPlayer 
                ? `Raid Progression: ${match.guild_profile.progression_label} @${match.guild_profile.realm}` 
                : `${match.player_profile.spec_name} ${match.player_profile.class_name} @${match.player_profile.realm}`
              }
            </p>
          </div>
        </div>

        <button 
          onClick={() => fetchMessages(false)}
          class="text-slate-400 hover:text-white p-2 rounded-xl transition-colors hover:bg-charcoal-dark"
          title="Refresh Messages"
        >
          <RefreshCw class="h-4 w-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div class="flex-grow p-4 overflow-y-auto space-y-4 max-h-[calc(100vh-14rem)] min-h-[300px]">
        <div class="text-center p-3 bg-charcoal/30 border border-charcoal-light/50 rounded-xl max-w-sm mx-auto">
          <p class="text-[10px] text-slate-400">
            Secure match chat initiated. Discuss raid days, specs, trial logs, and expectations.
          </p>
        </div>

        {messages.length === 0 ? (
          <div class="text-center text-xs text-slate-500 py-12 flex flex-col items-center gap-2">
            <MessageSquare class="h-8 w-8 text-charcoal-light" />
            <span>Send a message to start the conversation!</span>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_user_id === user?.id
            
            return (
              <div 
                key={msg.id} 
                class={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div class={`max-w-md rounded-2xl px-4 py-2.5 text-sm ${
                  isMe 
                    ? 'bg-accent text-white rounded-br-none shadow-glow-purple' 
                    : 'bg-charcoal border border-charcoal-light text-slate-200 rounded-bl-none'
                }`}>
                  <p class="whitespace-pre-wrap break-words">{msg.body}</p>
                  <div class={`text-[8px] mt-1 text-right flex items-center justify-end gap-1 ${
                    isMe ? 'text-purple-200' : 'text-slate-500'
                  }`}>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && (
                      <span>• {msg.read_at ? 'Read' : 'Sent'}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Panel */}
      <form onSubmit={handleSendMessage} class="bg-charcoal border-t border-charcoal-light p-4 flex gap-3 sticky bottom-0 z-30">
        <input 
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder={`Message ${otherPartyName}...`}
          class="flex-grow bg-charcoal-dark border border-charcoal-light px-4 py-3 rounded-xl text-sm text-white focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          class="bg-accent hover:bg-accent-dark disabled:bg-charcoal border border-accent/20 text-white p-3 rounded-xl transition-all shadow-glow-purple flex items-center justify-center shrink-0"
        >
          <Send class="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

export default MatchMessages
