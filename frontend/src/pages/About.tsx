import React from 'react'
import { Flame, Shield, Users, Zap } from 'lucide-react'

const About: React.FC = () => {
  return (
    <div className="bg-charcoal-dark min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black text-white">About GuildPing</h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Bridging the gap between active players and guild recruiters through instant, real-time feedback loops.
          </p>
        </div>

        <div className="bg-charcoal border border-charcoal-light rounded-2xl p-8 space-y-6">
          <h3 className="text-2xl font-bold text-white">The Guild Recruitment Problem</h3>
          <p className="text-slate-300 leading-relaxed text-sm">
            Recruiting in World of Warcraft has traditionally been a slow and painful process. Players fill out long Google Form applications that recruiters might never check. Recruiters paste invite messages on forums, only for applicants to move on to other teams before a request is received.
          </p>
          <p className="text-slate-300 leading-relaxed text-sm">
            <strong>GuildPing</strong> resolves this. We created a Tinder-like match mechanics model for guilds: express interest in one click, write a short optional note, and wait for a mutual match. If the guild recruiter accepts or has reciprocal interest, a direct chat channel opens instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-charcoal border border-charcoal-light rounded-2xl p-6 flex gap-4">
            <div className="h-10 w-10 shrink-0 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h5 className="font-bold text-white mb-1">Instant Interest Verification</h5>
              <p className="text-slate-400 text-xs leading-relaxed">
                Click express interest and have it registered immediately. No long resumes or test raids required at early stages.
              </p>
            </div>
          </div>

          <div className="bg-charcoal border border-charcoal-light rounded-2xl p-6 flex gap-4">
            <div className="h-10 w-10 shrink-0 bg-accent/20 rounded-xl flex items-center justify-center text-accent">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h5 className="font-bold text-white mb-1">Privacy Controls</h5>
              <p className="text-slate-400 text-xs leading-relaxed">
                Toggle your player profile to Private or Unlisted. Choose exactly who sees your items and logs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default About
