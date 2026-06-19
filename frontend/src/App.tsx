import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { Bell, Flame, Shield, LogOut, Search, User as UserIcon, MessageSquare, Menu, X } from 'lucide-react'

// Import all pages (to be created next)
import Landing from './pages/Landing'
import About from './pages/About'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import BrowseGuilds from './pages/BrowseGuilds'
import BrowsePlayers from './pages/BrowsePlayers'
import Matches from './pages/Matches'
import MatchMessages from './pages/MatchMessages'
import NotificationsPage from './pages/NotificationsPage'
import Settings from './pages/Settings'
import PlayerProfileForm from './pages/PlayerProfileForm'
import GuildProfileForm from './pages/GuildProfileForm'

// --- AUTH CONTEXT & CLIENT STATE ---

interface User {
  id: int
  email: string
  username: string
  is_admin: bool
}

interface AuthContextType {
  token: string | null
  user: User | null
  login: (token: string) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside an AuthProvider")
  return context
}

// --- NOTIFICATION REAL-TIME TOASTS ---

export interface ToastMessage {
  id: string
  title: string
  body: string
}

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("gp_token"))
  const [user, setUser] = useState<User | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const login = (newToken: string) => {
    localStorage.setItem("gp_token", newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem("gp_token")
    setToken(null)
    setUser(null)
    if (wsRef.current) {
      wsRef.current.close()
    }
  }

  const refreshUser = async () => {
    if (!token) return
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data)
      } else {
        logout()
      }
    } catch {
      logout()
    }
  }

  // Fetch initial unread notification count
  const fetchUnreadCount = async () => {
    if (!token) return
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const notifs = await res.json()
        const unread = notifs.filter((n: any) => !n.is_read).length
        setUnreadNotifications(unread)
      }
    } catch {}
  }

  useEffect(() => {
    if (token) {
      refreshUser()
      fetchUnreadCount()
    }
  }, [token])

  // Setup WebSocket connection when user is verified
  useEffect(() => {
    if (!user || !token) return

    // Determine WS protocol
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`

    const connectWs = () => {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("WebSocket connection established.")
        // Start keepalive heartbeat
        const timer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping")
          }
        }, 30000)
        ws.onclose = () => clearInterval(timer)
      }

      ws.onmessage = (event) => {
        if (event.data === "pong") return
        try {
          const notification = JSON.parse(event.data)
          // Increment unread count
          setUnreadNotifications(prev => prev + 1)
          // Trigger floating toast
          showToast(notification.title, notification.body)
        } catch (e) {
          console.error("Error parsing WebSocket message:", e)
        }
      }

      ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.reason)
        // Auto-reconnect after 3 seconds if user is still logged in
        if (token) {
          setTimeout(connectWs, 3000)
        }
      }
    }

    connectWs()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [user, token])

  const showToast = (title: string, body: string) => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { id, title, body }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshUser }}>
      <BrowserRouter>
        <div class="flex flex-col min-h-screen">
          <NavigationHeader 
            unreadNotifications={unreadNotifications} 
            setUnreadNotifications={setUnreadNotifications}
          />
          <main class="flex-grow flex flex-col">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Authenticated Routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/players/create" element={<PlayerProfileForm />} />
              <Route path="/players/edit/:id" element={<PlayerProfileForm />} />
              <Route path="/guilds/create" element={<GuildProfileForm />} />
              <Route path="/guilds/edit/:id" element={<GuildProfileForm />} />
              <Route path="/guilds" element={<BrowseGuilds />} />
              <Route path="/players" element={<BrowsePlayers />} />
              <Route path="/matches" element={<Matches />} />
              <Route path="/matches/:id/messages" element={<MatchMessages />} />
              <Route path="/notifications" element={<NotificationsPage setUnreadCount={setUnreadNotifications} />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <Footer />
        </div>

        {/* Floating Toast Notification Container */}
        <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
          {toasts.map(toast => (
            <div 
              key={toast.id} 
              class="bg-charcoal border-l-4 border-accent text-white p-4 rounded-r-xl shadow-2xl border border-charcoal-light animate-bounce"
            >
              <h5 class="font-bold text-sm text-glow-purple">{toast.title}</h5>
              <p class="text-xs text-slate-300 mt-1">{toast.body}</p>
            </div>
          ))}
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

// --- CORE FRAME COMPONENT LAYOUTS ---

interface NavigationHeaderProps {
  unreadNotifications: number
  setUnreadNotifications: React.Dispatch<React.SetStateAction<number>>
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({ unreadNotifications }) => {
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <header class="bg-charcoal-dark border-b border-charcoal-light sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          {/* Logo Title */}
          <div class="flex items-center gap-2">
            <Link to={user ? "/dashboard" : "/"} class="flex items-center gap-2 group">
              <div class="h-9 w-9 rounded-xl bg-accent flex items-center justify-center font-extrabold text-white text-glow-purple">GP</div>
              <span class="text-lg font-black tracking-wider text-white group-hover:text-accent transition-colors">GUILDPING</span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav class="hidden md:flex items-center gap-6">
            <Link to="/guilds" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Find Guilds</Link>
            <Link to="/players" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Recruit Players</Link>
            <Link to="/about" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">About</Link>
            
            {user ? (
              <>
                <Link to="/dashboard" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Dashboard</Link>
                <Link to="/matches" class="text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors">
                  <MessageSquare class="h-4 w-4" /> Matches
                </Link>
                <Link to="/notifications" class="relative text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                  <Bell class="h-4 w-4" />
                  {unreadNotifications > 0 && (
                    <span class="absolute -top-2 -right-2 bg-accent text-[9px] font-extrabold text-white h-4 w-4 rounded-full flex items-center justify-center border-2 border-charcoal-dark shadow-glow-purple">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>
                <div class="h-4 w-px bg-charcoal-light"></div>
                <Link to="/settings" class="text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors">
                  <UserIcon class="h-4 w-4" /> {user.username}
                </Link>
                <button onClick={logout} class="text-sm font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors">
                  <LogOut class="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Login</Link>
                <Link to="/register" class="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-xl text-sm font-bold shadow-glow-purple hover:scale-105 active:scale-95 transition-all">
                  Register
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu button */}
          <div class="flex md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              class="text-slate-300 hover:text-white p-2 rounded-lg"
            >
              {mobileMenuOpen ? <X class="h-6 w-6" /> : <Menu class="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Options */}
      {mobileMenuOpen && (
        <div class="md:hidden bg-charcoal border-b border-charcoal-light px-4 pt-2 pb-4 space-y-2">
          <Link to="/guilds" onClick={() => setMobileMenuOpen(false)} class="block px-3 py-2 rounded-lg text-base font-semibold text-slate-300 hover:bg-charcoal-light hover:text-white">Find Guilds</Link>
          <Link to="/players" onClick={() => setMobileMenuOpen(false)} class="block px-3 py-2 rounded-lg text-base font-semibold text-slate-300 hover:bg-charcoal-light hover:text-white">Recruit Players</Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)} class="block px-3 py-2 rounded-lg text-base font-semibold text-slate-300 hover:bg-charcoal-light hover:text-white">About</Link>
          
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} class="block px-3 py-2 rounded-lg text-base font-semibold text-slate-300 hover:bg-charcoal-light hover:text-white">Dashboard</Link>
              <Link to="/matches" onClick={() => setMobileMenuOpen(false)} class="block px-3 py-2 rounded-lg text-base font-semibold text-slate-300 hover:bg-charcoal-light hover:text-white flex items-center gap-1.5"><MessageSquare class="h-4 w-4" /> Matches</Link>
              <Link to="/notifications" onClick={() => setMobileMenuOpen(false)} class="block px-3 py-2 rounded-lg text-base font-semibold text-slate-300 hover:bg-charcoal-light hover:text-white flex items-center gap-1.5">
                <Bell class="h-4 w-4" /> Notifications
                {unreadNotifications > 0 && <span class="bg-accent text-white px-2 py-0.5 rounded-full text-xs font-bold">{unreadNotifications}</span>}
              </Link>
              <Link to="/settings" onClick={() => setMobileMenuOpen(false)} class="block px-3 py-2 rounded-lg text-base font-semibold text-slate-300 hover:bg-charcoal-light hover:text-white flex items-center gap-1.5"><UserIcon class="h-4 w-4" /> {user.username}</Link>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} class="w-full text-left px-3 py-2 rounded-lg text-base font-semibold text-rose-400 hover:bg-charcoal-light flex items-center gap-1.5"><LogOut class="h-4 w-4" /> Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} class="block px-3 py-2 rounded-lg text-base font-semibold text-slate-300 hover:bg-charcoal-light hover:text-white">Login</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} class="block text-center bg-accent text-white px-4 py-2 rounded-xl text-base font-bold shadow-glow-purple">Register</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}

const Footer: React.FC = () => {
  return (
    <footer class="bg-charcoal-dark border-t border-charcoal-light py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:flex md:justify-between md:items-center">
        <p class="text-sm text-slate-500">© 2026 GuildPing. Real-time WoW recruitment platform. All rights reserved.</p>
        <div class="mt-4 md:mt-0 flex justify-center gap-6">
          <Link to="/about" class="text-xs text-slate-400 hover:text-white transition-colors">About Us</Link>
          <a href="https://github.com/ShortyWoW" target="_blank" rel="noreferrer" class="text-xs text-slate-400 hover:text-white transition-colors">Github</a>
        </div>
      </div>
    </footer>
  )
}

export default App
