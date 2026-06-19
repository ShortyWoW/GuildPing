import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Eye, Trash2, Clock, Shield, User, Heart, MessageSquare, AlertCircle } from 'lucide-react'
import { useAuth } from '../App'

interface Notification {
  id: number
  type: string
  title: string
  body: string
  payload: any
  is_read: boolean
  created_at: string
}

interface NotificationsPageProps {
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ setUnreadCount }) => {
  const { token } = useAuth()
  const navigate = useNavigate()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    if (!token) return
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        // Calculate unread count and update parent state
        const unread = data.filter((n: Notification) => !n.is_read).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error("Failed to load notifications:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      navigate("/login")
      return
    }
    fetchNotifications()
  }, [token])

  const handleMarkAsRead = async (id: number) => {
    if (!token) return
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
        // Decrement unread count
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!token) return
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err)
    }
  }

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id)
    }
    
    // Redirect user to appropriate route based on payload
    if (notif.payload) {
      if (notif.payload.match_id) {
        navigate(`/matches/${notif.payload.match_id}/messages`)
      } else if (notif.payload.interest_id || notif.payload.player_profile_id || notif.payload.guild_profile_id) {
        navigate("/dashboard")
      }
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "match_created":
        return <Heart className="h-5 w-5 text-emerald-400 fill-emerald-500/10" />
      case "interest_received":
        return <User className="h-5 w-5 text-accent" />
      case "message_received":
        return <MessageSquare className="h-5 w-5 text-blue-400" />
      default:
        return <Bell className="h-5 w-5 text-slate-400" />
    }
  }

  return (
    <div className="bg-charcoal-dark min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-charcoal-light pb-6">
        <div>
          <h1 className="text-3xl font-black text-glow-purple text-white flex items-center gap-2.5">
            <Bell className="h-8 w-8 text-accent" /> Notifications Log
          </h1>
          <p className="text-slate-400 text-sm mt-2">Check recent recruitment offers, matches, and real-time announcements.</p>
        </div>
        
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="bg-charcoal border border-charcoal-light hover:border-slate-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all self-start sm:self-center"
          >
            <Check className="h-4 w-4 text-emerald-400" /> Mark All Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-charcoal border border-charcoal-light rounded-2xl p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Clock className="animate-spin h-8 w-8 text-accent" />
          <span className="text-sm">Fetching notifications...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-charcoal border border-charcoal-light rounded-2xl p-16 text-center text-slate-400 space-y-4">
          <Bell className="h-12 w-12 mx-auto text-charcoal-light animate-bounce" />
          <p className="text-sm">No notifications found. All clear!</p>
        </div>
      ) : (
        <div className="bg-charcoal border border-charcoal-light rounded-2xl overflow-hidden divide-y divide-charcoal-light shadow-2xl">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`p-5 flex items-start gap-4 transition-all hover:bg-charcoal-dark/30 ${
                notif.is_read ? 'opacity-70' : 'bg-charcoal-dark/10 border-l-4 border-accent'
              }`}
            >
              <div className="p-2 rounded-xl bg-charcoal-dark border border-charcoal-light shrink-0">
                {getIcon(notif.type)}
              </div>

              <div className="flex-grow min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-extrabold text-sm text-white truncate">{notif.title}</h4>
                  <span className="text-[9px] text-slate-500 font-semibold shrink-0">
                    {new Date(notif.created_at).toLocaleDateString()} @ {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 pr-4">{notif.body}</p>
                
                <div className="pt-2 flex gap-3 text-[10px] font-bold">
                  <button 
                    onClick={() => handleNotificationClick(notif)}
                    className="text-accent-light hover:text-accent flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Details
                  </button>
                  
                  {!notif.is_read && (
                    <button 
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" /> Mark Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
