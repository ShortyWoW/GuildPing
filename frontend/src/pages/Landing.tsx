import React from 'react'
import { Link } from 'react-router-dom'
import { Zap, Shield, Search, Flame, Users, Sparkles } from 'lucide-react'
import { useAuth } from '../App'

const Landing: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="flex flex-col bg-charcoal-dark min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center border-b border-charcoal-light bg-gradient-to-b from-charcoal to-charcoal-dark">
        {/* Background glow graphics */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/15 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-xs font-bold text-accent-light uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Real-time WoW recruitment platform
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Find the right guild. <br />
            Find the right players. <br />
            <span className="text-glow-purple text-accent-light">Talk Instantly.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-medium">
            Current WoW recruitment is slow, scattered, and easy to miss. GuildPing connects raiders and guild leaders directly.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
            <Link 
              to="/guilds" 
              className="px-8 py-4 bg-accent hover:bg-accent-dark text-white rounded-xl font-bold text-lg shadow-glow-purple hover:scale-105 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              <Search className="h-5 w-5" /> Find a Guild
            </Link>
            <Link 
              to="/players" 
              className="px-8 py-4 bg-charcoal border border-charcoal-light hover:border-slate-400 text-white rounded-xl font-bold text-lg hover:scale-105 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
            >
              <Users className="h-5 w-5" /> Recruit Players
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl font-extrabold text-white">Why Guild<span className="text-accent">Ping</span>?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">We streamline recruitment down to direct connections and instant real-time conversations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-charcoal border border-charcoal-light p-8 rounded-2xl glow-card">
            <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent mb-6">
              <Zap className="h-6 w-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Instant Mutual Interest</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Express interest in one click. No long form applications or resume links. Once both sides match, conversation opens instantly.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-charcoal border border-charcoal-light p-8 rounded-2xl glow-card">
            <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent mb-6">
              <Sparkles className="h-6 w-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Real-time Messaging</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              No more checking forums or spamming discord requests. Chat directly within the web app and receive push notifications on updates.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-charcoal border border-charcoal-light p-8 rounded-2xl glow-card">
            <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent mb-6">
              <Shield className="h-6 w-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Recruitment Badges</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Clear visual badges indicating recruitment status. Instantly see who is actively looking, selectively opening, or not seeking applications.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Landing
