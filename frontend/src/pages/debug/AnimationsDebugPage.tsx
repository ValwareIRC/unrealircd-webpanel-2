import { useState } from 'react'
import { Button, Badge } from '@/components/common'
import { holidays } from '@/components/common/SeasonalAnimations'
import { 
  Snowflake, Ghost, Sparkles, PartyPopper, Flame, Heart, Bird,
  Palette, Egg, Moon, Clover, Cookie, Flower2, Theater, Droplets,
  ScrollText, Cherry, Beer, Calendar, Sun, Wheat
} from 'lucide-react'

// Animation components (imported inline to avoid circular deps)
import { useEffect, useMemo } from 'react'

interface Particle {
  id: number
  x: number
  y?: number
  size: number
  duration: number
  delay: number
  opacity: number
  drift?: number
  rotation?: number
  color?: string
  variant?: number
}

function generateParticles(count: number, options?: {
  colors?: string[]
  variants?: number
}): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.6 + 0.4,
      drift: (Math.random() - 0.5) * 100,
      rotation: Math.random() * 360,
      color: options?.colors?.[Math.floor(Math.random() * (options.colors?.length || 1))],
      variant: options?.variants ? Math.floor(Math.random() * options.variants) : 0,
    })
  }
  return particles
}

// All animation components copied for the debug page
function SnowfallAnimation() {
  const particles = useMemo(() => generateParticles(50), [])
  return (
    <>
      <style>{`
        @keyframes snowfall { 0% { transform: translateY(-10px) translateX(0px) rotate(0deg); } 25% { transform: translateY(25vh) translateX(var(--drift)) rotate(90deg); } 50% { transform: translateY(50vh) translateX(0px) rotate(180deg); } 75% { transform: translateY(75vh) translateX(calc(var(--drift) * -1)) rotate(270deg); } 100% { transform: translateY(100vh) translateX(0px) rotate(360deg); } }
      `}</style>
      {particles.map((p) => (
        <div key={p.id} className="absolute rounded-full bg-white" style={{ left: `${p.x}%`, top: '-10px', width: `${p.size}px`, height: `${p.size}px`, opacity: p.opacity, animation: `snowfall ${p.duration}s linear ${p.delay}s infinite`, '--drift': `${p.drift}px`, boxShadow: `0 0 ${p.size}px rgba(255, 255, 255, 0.5)` } as React.CSSProperties} />
      ))}
    </>
  )
}

function GhostsAnimation() {
  const particles = useMemo(() => generateParticles(15), [])
  return (
    <>
      <style>{`
        @keyframes ghostFloat { 0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.7; } 25% { transform: translateY(-30px) translateX(20px) scale(1.05); opacity: 0.9; } 50% { transform: translateY(-10px) translateX(-15px) scale(0.95); opacity: 0.6; } 75% { transform: translateY(-40px) translateX(10px) scale(1.02); opacity: 0.8; } }
        @keyframes ghostWobble { 0%, 100% { transform: skewX(0deg); } 25% { transform: skewX(3deg); } 75% { transform: skewX(-3deg); } }
      `}</style>
      {particles.map((p) => (
        <div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 50) * 0.7 + 15}%`, animation: `ghostFloat ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite` }}>
          <div style={{ fontSize: `${p.size * 8}px`, opacity: p.opacity * 0.8, animation: `ghostWobble ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`, filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))' }}>👻</div>
        </div>
      ))}
    </>
  )
}

function FireworksAnimation() {
  const [fireworks, setFireworks] = useState<Particle[]>([])
  useEffect(() => {
    const colors = ['#ff0000', '#00ff00', '#0066ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4']
    const launchFirework = () => {
      const id = Date.now() + Math.random()
      const newFirework: Particle = { id, x: Math.random() * 80 + 10, y: Math.random() * 40 + 10, size: Math.random() * 2 + 1, duration: 1.5, delay: 0, opacity: 1, color: colors[Math.floor(Math.random() * colors.length)] }
      setFireworks(prev => [...prev, newFirework])
      setTimeout(() => setFireworks(prev => prev.filter(f => f.id !== id)), 2000)
    }
    const interval = setInterval(() => { if (Math.random() > 0.3) launchFirework() }, 800)
    return () => clearInterval(interval)
  }, [])
  return (
    <>
      <style>{`
        @keyframes fireworkBurst { 0% { transform: scale(0); opacity: 1; } 50% { opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
        @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
      `}</style>
      {fireworks.map((fw) => (
        <div key={fw.id} className="absolute" style={{ left: `${fw.x}%`, top: `${fw.y}%` }}>
          {[...Array(12)].map((_, i) => (<div key={i} className="absolute rounded-full" style={{ width: '4px', height: '4px', background: fw.color, boxShadow: `0 0 6px ${fw.color}, 0 0 12px ${fw.color}`, animation: `fireworkBurst 1.5s ease-out forwards`, transform: `rotate(${i * 30}deg) translateX(${50 + Math.random() * 30}px)` }} />))}
          {[...Array(8)].map((_, i) => (<div key={`s${i}`} className="absolute rounded-full" style={{ width: '3px', height: '3px', background: '#ffffff', animation: `sparkle 1s ease-out ${i * 0.1}s forwards`, transform: `rotate(${i * 45}deg) translateX(${20 + Math.random() * 20}px)` }} />))}
        </div>
      ))}
    </>
  )
}

function LanternsAnimation() {
  const particles = useMemo(() => generateParticles(20, { colors: ['#ff0000', '#ff3300', '#ff6600', '#ffcc00'] }), [])
  return (
    <>
      <style>{`
        @keyframes lanternFloat { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-20px) rotate(3deg); } }
        @keyframes lanternGlow { 0%, 100% { filter: drop-shadow(0 0 8px var(--glow-color)); } 50% { filter: drop-shadow(0 0 15px var(--glow-color)); } }
      `}</style>
      {particles.map((p) => (
        <div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 0) * 0.6 + 5}%`, fontSize: `${p.size * 6}px`, animation: `lanternFloat ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite, lanternGlow ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`, '--glow-color': p.color || '#ff0000', opacity: p.opacity } as React.CSSProperties}>🏮</div>
      ))}
    </>
  )
}

function DiyasAnimation() {
  const particles = useMemo(() => generateParticles(30, { colors: ['#ff9900', '#ffcc00', '#ff6600'] }), [])
  return (
    <>
      <style>{`
        @keyframes diyaFlicker { 0%, 100% { transform: scale(1) translateY(0); opacity: 0.9; } 25% { transform: scale(1.1) translateY(-2px); opacity: 1; } 50% { transform: scale(0.95) translateY(1px); opacity: 0.85; } 75% { transform: scale(1.05) translateY(-1px); opacity: 0.95; } }
        @keyframes diyaFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
      `}</style>
      {particles.map((p) => (
        <div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 50) * 0.7 + 20}%`, animation: `diyaFloat ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite` }}>
          <div style={{ fontSize: `${p.size * 5}px`, animation: `diyaFlicker ${1 + Math.random()}s ease-in-out infinite`, filter: `drop-shadow(0 0 ${p.size * 2}px ${p.color})` }}>🪔</div>
        </div>
      ))}
      {particles.slice(0, 15).map((p) => (
        <div key={`sparkle-${p.id}`} className="absolute" style={{ left: `${p.x + (Math.random() - 0.5) * 10}%`, top: `${(p.y || 50) * 0.7 + 15}%`, fontSize: `${p.size * 2}px`, animation: `diyaFlicker ${0.5 + Math.random() * 0.5}s ease-in-out ${p.delay}s infinite`, opacity: 0.7 }}>✨</div>
      ))}
    </>
  )
}

function HeartsAnimation() {
  const particles = useMemo(() => generateParticles(25, { colors: ['#ff1493', '#ff69b4', '#ff0066', '#ff3366', '#ff6699'] }), [])
  return (
    <>
      <style>{`
        @keyframes heartFloat { 0% { transform: translateY(100vh) translateX(0) scale(0) rotate(0deg); opacity: 0; } 10% { opacity: 1; transform: translateY(90vh) scale(1); } 90% { opacity: 1; } 100% { transform: translateY(-10vh) translateX(var(--drift)) scale(0.5) rotate(var(--rotation)); opacity: 0; } }
        @keyframes heartPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
      `}</style>
      {particles.map((p) => (
        <div key={p.id} className="absolute" style={{ left: `${p.x}%`, bottom: '-20px', fontSize: `${p.size * 5}px`, color: p.color, animation: `heartFloat ${p.duration}s ease-out ${p.delay}s infinite`, '--drift': `${p.drift}px`, '--rotation': `${(Math.random() - 0.5) * 40}deg`, filter: `drop-shadow(0 0 5px ${p.color})` } as React.CSSProperties}>
          <span style={{ animation: `heartPulse ${1 + Math.random()}s ease-in-out infinite` }}>❤️</span>
        </div>
      ))}
    </>
  )
}

function MagpiesAnimation() {
  const particles = useMemo(() => generateParticles(12), [])
  const stars = useMemo(() => generateParticles(40), [])
  return (
    <>
      <style>{`
        @keyframes magpieFly { 0%, 100% { transform: translateX(0) translateY(0) scaleX(1); } 25% { transform: translateX(30px) translateY(-20px) scaleX(1); } 50% { transform: translateX(0) translateY(-10px) scaleX(-1); } 75% { transform: translateX(-30px) translateY(-25px) scaleX(-1); } }
        @keyframes starTwinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
      `}</style>
      {stars.map((s) => (<div key={`star-${s.id}`} className="absolute" style={{ left: `${s.x}%`, top: `${(s.y || 0) * 0.8}%`, fontSize: `${s.size * 2}px`, animation: `starTwinkle ${2 + Math.random() * 2}s ease-in-out ${s.delay}s infinite`, opacity: s.opacity * 0.6 }}>⭐</div>))}
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 0) * 0.5 + 10}%`, fontSize: `${p.size * 4}px`, animation: `magpieFly ${p.duration * 0.8}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity }}>🐦‍⬛</div>))}
    </>
  )
}

function ColorPowderAnimation() {
  const particles = useMemo(() => generateParticles(60, { colors: ['#ff0066', '#ff6600', '#ffff00', '#00ff00', '#00ccff', '#9900ff', '#ff00ff'] }), [])
  return (
    <>
      <style>{`@keyframes powderBurst { 0% { transform: translateY(50vh) scale(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(calc(var(--end-y) * 1vh)) translateX(var(--drift)) scale(2); opacity: 0; } }`}</style>
      {particles.map((p) => (<div key={p.id} className="absolute rounded-full" style={{ left: `${p.x}%`, top: '50%', width: `${p.size * 4}px`, height: `${p.size * 4}px`, background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`, animation: `powderBurst ${p.duration * 0.6}s ease-out ${p.delay}s infinite`, '--end-y': `${Math.random() * 80 - 40}`, '--drift': `${p.drift}px`, filter: `blur(${p.size}px)` } as React.CSSProperties} />))}
    </>
  )
}

function EggsAnimation() {
  const particles = useMemo(() => generateParticles(20, { variants: 6 }), [])
  const eggEmojis = ['🥚', '🐣', '🐰', '🌷', '🦋', '🌸']
  return (
    <>
      <style>{`
        @keyframes eggBounce { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-30px) rotate(10deg); } 50% { transform: translateY(-15px) rotate(-5deg); } 75% { transform: translateY(-40px) rotate(5deg); } }
        @keyframes eggWobble { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
      `}</style>
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 50) * 0.6 + 25}%`, fontSize: `${p.size * 5}px`, animation: `eggBounce ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity }}><span style={{ animation: `eggWobble ${1 + Math.random()}s ease-in-out infinite` }}>{eggEmojis[p.variant || 0]}</span></div>))}
    </>
  )
}

function CrescentsAnimation() {
  const particles = useMemo(() => generateParticles(25, { colors: ['#ffd700', '#fffacd', '#f0e68c'] }), [])
  return (
    <>
      <style>{`
        @keyframes crescentGlow { 0%, 100% { filter: drop-shadow(0 0 5px #ffd700); transform: scale(1); } 50% { filter: drop-shadow(0 0 15px #ffd700); transform: scale(1.1); } }
        @keyframes crescentFloat { 0%, 100% { transform: translateY(0) rotate(-10deg); } 50% { transform: translateY(-20px) rotate(10deg); } }
        @keyframes starShimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
      {particles.map((p) => (<div key={`star-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 0) * 0.7}%`, fontSize: `${p.size * 2}px`, animation: `starShimmer ${2 + Math.random() * 2}s ease-in-out ${p.delay}s infinite`, color: p.color }}>⭐</div>))}
      {particles.slice(0, 10).map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 0) * 0.5 + 10}%`, fontSize: `${p.size * 6}px`, animation: `crescentFloat ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite, crescentGlow ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity }}>🌙</div>))}
    </>
  )
}

function CloversAnimation() {
  const particles = useMemo(() => generateParticles(35, { colors: ['#00cc00', '#00ff00', '#228b22', '#32cd32'] }), [])
  return (
    <>
      <style>{`@keyframes cloverFall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }`}</style>
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: '-20px', fontSize: `${p.size * 4}px`, color: p.color, animation: `cloverFall ${p.duration}s linear ${p.delay}s infinite`, filter: `drop-shadow(0 0 3px ${p.color})` }}>☘️</div>))}
    </>
  )
}

function MooncakesAnimation() {
  const particles = useMemo(() => generateParticles(15), [])
  const lanterns = useMemo(() => generateParticles(10), [])
  return (
    <>
      <style>{`
        @keyframes mooncakeGlow { 0%, 100% { filter: drop-shadow(0 0 10px #ffd700); } 50% { filter: drop-shadow(0 0 20px #ffcc00); } }
        @keyframes lanternSway { 0%, 100% { transform: rotate(-5deg) translateY(0); } 50% { transform: rotate(5deg) translateY(-10px); } }
      `}</style>
      <div className="absolute" style={{ right: '10%', top: '10%', fontSize: '80px', animation: 'mooncakeGlow 4s ease-in-out infinite', opacity: 0.9 }}>🌕</div>
      {lanterns.map((p) => (<div key={`lantern-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 0) * 0.4 + 5}%`, fontSize: `${p.size * 5}px`, animation: `lanternSway ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity }}>🏮</div>))}
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 50) * 0.6 + 30}%`, fontSize: `${p.size * 4}px`, animation: `lanternSway ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity }}>🥮</div>))}
    </>
  )
}

function MarigoldsAnimation() {
  const particles = useMemo(() => generateParticles(40, { colors: ['#ff6600', '#ff9900', '#ffcc00', '#ff3300'] }), [])
  return (
    <>
      <style>{`
        @keyframes marigoldFall { 0% { transform: translateY(-10px) rotate(0deg) scale(1); opacity: 0; } 10% { opacity: 1; } 50% { transform: translateY(50vh) rotate(180deg) scale(0.9); } 100% { transform: translateY(100vh) rotate(360deg) scale(0.7); opacity: 0.3; } }
        @keyframes skullGlow { 0%, 100% { filter: drop-shadow(0 0 5px #ff6600); } 50% { filter: drop-shadow(0 0 15px #ffcc00); } }
      `}</style>
      {particles.slice(0, 8).map((p) => (<div key={`skull-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 50) * 0.6 + 20}%`, fontSize: `${p.size * 5}px`, animation: `skullGlow ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity * 0.8 }}>💀</div>))}
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: '-20px', fontSize: `${p.size * 3}px`, animation: `marigoldFall ${p.duration}s linear ${p.delay}s infinite`, filter: `drop-shadow(0 0 3px ${p.color})` }}>🌼</div>))}
    </>
  )
}

function ConfettiAnimation() {
  const particles = useMemo(() => generateParticles(80, { colors: ['#9b4dca', '#ffd700', '#00a651', '#ff0066', '#00ccff', '#ff6600'] }), [])
  return (
    <>
      <style>{`
        @keyframes confettiFall { 0% { transform: translateY(-10px) rotate(0deg) rotateX(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg) rotateX(720deg); opacity: 0.5; } }
        @keyframes confettiSway { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(15px); } 75% { transform: translateX(-15px); } }
      `}</style>
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: '-10px', width: `${p.size * 2}px`, height: `${p.size * 3}px`, background: p.color, animation: `confettiFall ${p.duration * 0.8}s linear ${p.delay}s infinite, confettiSway ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`, borderRadius: '2px' }} />))}
      {particles.slice(0, 5).map((p) => (<div key={`mask-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 30) * 0.5 + 20}%`, fontSize: `${p.size * 6}px`, opacity: p.opacity * 0.7 }}>🎭</div>))}
    </>
  )
}

function WaterAnimation() {
  const particles = useMemo(() => generateParticles(50, { colors: ['#00bfff', '#87ceeb', '#00ced1', '#40e0d0'] }), [])
  return (
    <>
      <style>{`
        @keyframes waterSplash { 0% { transform: translateY(var(--start-y)) scale(0); opacity: 0; } 20% { opacity: 0.8; transform: scale(1); } 100% { transform: translateY(calc(var(--start-y) + 100px)) scale(0.5); opacity: 0; } }
        @keyframes waterDrop { 0% { transform: translateY(-20px) scale(1); opacity: 0; } 10% { opacity: 0.8; } 100% { transform: translateY(100vh) scale(0.5); opacity: 0; } }
      `}</style>
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: '-20px', fontSize: `${p.size * 3}px`, animation: `waterDrop ${p.duration * 0.5}s linear ${p.delay}s infinite`, color: p.color, filter: `drop-shadow(0 0 3px ${p.color})` }}>💧</div>))}
      {particles.slice(0, 15).map((p) => (<div key={`splash-${p.id}`} className="absolute rounded-full" style={{ left: `${p.x}%`, width: `${p.size * 8}px`, height: `${p.size * 4}px`, background: `radial-gradient(ellipse, ${p.color}60 0%, transparent 70%)`, animation: `waterSplash ${p.duration * 0.4}s ease-out ${p.delay}s infinite`, '--start-y': `${(p.y || 50) + 30}vh` } as React.CSSProperties} />))}
    </>
  )
}

function TanzakuAnimation() {
  const particles = useMemo(() => generateParticles(25, { colors: ['#ff69b4', '#87ceeb', '#98fb98', '#dda0dd', '#f0e68c', '#ffb6c1'] }), [])
  return (
    <>
      <style>{`
        @keyframes tanzakuSway { 0%, 100% { transform: rotate(-10deg) translateY(0); } 50% { transform: rotate(10deg) translateY(5px); } }
        @keyframes bambooSway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
      `}</style>
      {particles.slice(0, 8).map((p) => (<div key={`bamboo-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: '0', fontSize: '40px', animation: `bambooSway ${3 + Math.random() * 2}s ease-in-out infinite`, opacity: 0.6 }}>🎋</div>))}
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 0) * 0.4 + 10}%`, width: `${p.size * 3}px`, height: `${p.size * 8}px`, background: p.color, borderRadius: '2px', animation: `tanzakuSway ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`, boxShadow: `0 2px 4px rgba(0,0,0,0.2)` }} />))}
      {particles.slice(0, 15).map((p) => (<div key={`star-${p.id}`} className="absolute" style={{ left: `${p.x + 5}%`, top: `${(p.y || 0) * 0.3}%`, fontSize: `${p.size * 2}px`, opacity: p.opacity * 0.7 }}>⭐</div>))}
    </>
  )
}

function SakuraAnimation() {
  const particles = useMemo(() => generateParticles(50, { colors: ['#ffb7c5', '#ffc0cb', '#ff69b4', '#ffb6c1', '#fff0f5'] }), [])
  return (
    <>
      <style>{`
        @keyframes sakuraFall { 0% { transform: translateY(-10px) translateX(0) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(100vh) translateX(var(--drift)) rotate(360deg); opacity: 0.3; } }
        @keyframes sakuraSway { 0%, 100% { transform: translateX(0) rotate(0deg); } 25% { transform: translateX(20px) rotate(10deg); } 75% { transform: translateX(-20px) rotate(-10deg); } }
      `}</style>
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: '-20px', fontSize: `${p.size * 3}px`, animation: `sakuraFall ${p.duration}s linear ${p.delay}s infinite, sakuraSway ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite`, '--drift': `${p.drift}px`, filter: `drop-shadow(0 0 2px ${p.color})` } as React.CSSProperties}>🌸</div>))}
    </>
  )
}

function PretzelsAnimation() {
  const particles = useMemo(() => generateParticles(20), [])
  return (
    <>
      <style>{`
        @keyframes pretzelFloat { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-20px) rotate(5deg); } }
        @keyframes beerFoam { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }
      `}</style>
      {particles.slice(0, 8).map((p) => (<div key={`beer-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 50) * 0.5 + 30}%`, fontSize: `${p.size * 5}px`, animation: `beerFoam ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity }}>🍺</div>))}
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 30) * 0.6 + 15}%`, fontSize: `${p.size * 4}px`, animation: `pretzelFloat ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity }}>🥨</div>))}
      {particles.slice(0, 15).map((p) => (<div key={`leaf-${p.id}`} className="absolute" style={{ left: `${p.x + 3}%`, top: `${(p.y || 0) * 0.4}%`, fontSize: `${p.size * 2}px`, opacity: p.opacity * 0.5 }}>🍂</div>))}
    </>
  )
}

function RainbowAnimation() {
  const particles = useMemo(() => generateParticles(60, { colors: ['#ff0000', '#ff8c00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff'] }), [])
  return (
    <>
      <style>{`
        @keyframes rainbowFloat { 0% { transform: translateY(100vh) scale(0); opacity: 0; } 10% { opacity: 1; transform: scale(1); } 100% { transform: translateY(-20vh) scale(0.8); opacity: 0; } }
        @keyframes rainbowPulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.3); } }
        @keyframes flagWave { 0%, 100% { transform: rotate(-5deg) scaleX(1); } 50% { transform: rotate(5deg) scaleX(0.95); } }
      `}</style>
      <div className="absolute" style={{ left: '20%', top: '5%', fontSize: '60px', opacity: 0.6, animation: 'rainbowPulse 3s ease-in-out infinite' }}>🌈</div>
      {particles.map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, bottom: '-20px', fontSize: `${p.size * 3}px`, animation: `rainbowFloat ${p.duration}s ease-out ${p.delay}s infinite`, filter: `drop-shadow(0 0 3px ${p.color})` }}><span style={{ color: p.color }}>❤️</span></div>))}
      {particles.slice(0, 5).map((p) => (<div key={`flag-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 30) * 0.5 + 10}%`, fontSize: `${p.size * 6}px`, animation: `flagWave ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity * 0.8 }}>🏳️‍🌈</div>))}
    </>
  )
}

function CandlesAnimation() {
  const particles = useMemo(() => generateParticles(35, { colors: ['#1e40af', '#3b82f6', '#93c5fd', '#ffffff', '#ffd700'] }), [])
  return (
    <>
      <style>{`
        @keyframes candleGlow { 0%, 100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.05); filter: brightness(1.3); } }
        @keyframes flameFlicker { 0%, 100% { transform: scaleY(1) translateY(0); opacity: 1; } 25% { transform: scaleY(1.1) translateY(-2px); opacity: 0.9; } 50% { transform: scaleY(0.95) translateY(1px); opacity: 1; } 75% { transform: scaleY(1.05) translateY(-1px); opacity: 0.85; } }
        @keyframes starOfDavid { 0%, 100% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.1); } }
      `}</style>
      {particles.slice(0, 9).map((p, i) => (<div key={`candle-${p.id}`} className="absolute" style={{ left: `${10 + i * 10}%`, bottom: '20%', fontSize: `${p.size * 5}px`, animation: `candleGlow ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite` }}>🕯️</div>))}
      {particles.slice(9, 20).map((p) => (<div key={`star-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 20) * 0.6}%`, fontSize: `${p.size * 3}px`, animation: `starOfDavid ${p.duration}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity * 0.7, color: p.color }}>✡️</div>))}
      {particles.slice(20).map((p) => (<div key={`sparkle-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 30) * 0.7}%`, fontSize: `${p.size * 2}px`, animation: `flameFlicker ${0.5 + Math.random() * 0.5}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity, color: '#ffd700' }}>✨</div>))}
    </>
  )
}

function FlowersAnimation() {
  const particles = useMemo(() => generateParticles(50, { colors: ['#ff69b4', '#ff1493', '#ff6347', '#ffa500', '#ffff00', '#9acd32', '#00fa9a', '#87ceeb'] }), [])
  const flowerEmojis = ['🌸', '🌺', '🌻', '🌷', '🌼', '💐', '🪻', '🌹']
  return (
    <>
      <style>{`
        @keyframes flowerFloat { 0% { transform: translateY(100vh) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-10vh) rotate(360deg); opacity: 0; } }
        @keyframes flowerSway { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        @keyframes petalFall { 0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) translateX(50px) rotate(720deg); opacity: 0.5; } }
      `}</style>
      {particles.slice(0, 25).map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, bottom: '-20px', fontSize: `${p.size * 3}px`, animation: `flowerFloat ${p.duration}s ease-out ${p.delay}s infinite` }}>{flowerEmojis[p.id % 8]}</div>))}
      {particles.slice(25, 40).map((p) => (<div key={`sway-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 40) * 0.7 + 15}%`, fontSize: `${p.size * 4}px`, animation: `flowerSway ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity * 0.8 }}>{flowerEmojis[p.id % 4]}</div>))}
      {particles.slice(40).map((p) => (<div key={`petal-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: '-5%', fontSize: `${p.size * 2}px`, animation: `petalFall ${p.duration * 1.5}s ease-in ${p.delay}s infinite`, opacity: p.opacity, color: p.color }}>🌸</div>))}
    </>
  )
}

function LotusAnimation() {
  const particles = useMemo(() => generateParticles(40, { colors: ['#ff69b4', '#ffffff', '#ffd700', '#87ceeb', '#dda0dd'] }), [])
  return (
    <>
      <style>{`
        @keyframes lotusFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-15px) scale(1.05); } }
        @keyframes lotusGlow { 0%, 100% { filter: drop-shadow(0 0 5px #ff69b4); } 50% { filter: drop-shadow(0 0 15px #ffd700); } }
        @keyframes wheelSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes candleFlicker { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }
      `}</style>
      {particles.slice(0, 5).map((p) => (<div key={`wheel-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 20) * 0.3 + 5}%`, fontSize: `${p.size * 5}px`, animation: `wheelSpin ${p.duration * 2}s linear ${p.delay}s infinite`, opacity: p.opacity * 0.6 }}>☸️</div>))}
      {particles.slice(5, 20).map((p) => (<div key={p.id} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 40) * 0.5 + 25}%`, fontSize: `${p.size * 4}px`, animation: `lotusFloat ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite, lotusGlow ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity }}>🪷</div>))}
      {particles.slice(20, 30).map((p) => (<div key={`candle-${p.id}`} className="absolute" style={{ left: `${p.x}%`, bottom: '10%', fontSize: `${p.size * 3}px`, animation: `candleFlicker ${0.5 + Math.random() * 0.5}s ease-in-out ${p.delay}s infinite` }}>🕯️</div>))}
      {particles.slice(30).map((p) => (<div key={`light-${p.id}`} className="absolute" style={{ left: `${p.x}%`, top: `${(p.y || 30) * 0.7}%`, fontSize: `${p.size * 2}px`, animation: `lotusGlow ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`, opacity: p.opacity }}>✨</div>))}
    </>
  )
}

// Animation map
const animationComponents: Record<string, React.FC> = {
  snowfall: SnowfallAnimation,
  ghosts: GhostsAnimation,
  fireworks: FireworksAnimation,
  lanterns: LanternsAnimation,
  diyas: DiyasAnimation,
  hearts: HeartsAnimation,
  magpies: MagpiesAnimation,
  colorpowder: ColorPowderAnimation,
  eggs: EggsAnimation,
  crescents: CrescentsAnimation,
  clovers: CloversAnimation,
  mooncakes: MooncakesAnimation,
  marigolds: MarigoldsAnimation,
  confetti: ConfettiAnimation,
  water: WaterAnimation,
  tanzaku: TanzakuAnimation,
  sakura: SakuraAnimation,
  pretzels: PretzelsAnimation,
  rainbow: RainbowAnimation,
  candles: CandlesAnimation,
  flowers: FlowersAnimation,
  lotus: LotusAnimation,
}

import { LucideIcon } from 'lucide-react'

// Icon map for holidays
const holidayIcons: Record<string, LucideIcon> = {
  'Christmas': Snowflake,
  'Halloween': Ghost,
  'New Year': PartyPopper,
  'Chinese New Year': Sparkles,
  'Diwali': Flame,
  "Valentine's Day": Heart,
  'Qixi Festival': Bird,
  'Holi': Palette,
  'Easter': Egg,
  'Eid al-Fitr': Moon,
  "St. Patrick's Day": Clover,
  'Mid-Autumn Festival': Cookie,
  'Día de los Muertos': Flower2,
  'Mardi Gras': Theater,
  'Carnival': Theater,
  'Songkran': Droplets,
  'Tanabata': ScrollText,
  'Hanami': Cherry,
  'Oktoberfest': Beer,
  'Chuseok': Wheat,
  'Hanukkah': Flame,
  'Nowruz': Sun,
  'Midsummer': Sun,
  'Maslenitsa': Sun,
  'Vesak': Flower2,
  'Loi Krathong': Sparkles,
  'Obon': Sparkles,
}

export default function AnimationsDebugPage() {
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null)

  const AnimationComponent = activeAnimation ? animationComponents[activeAnimation] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Seasonal Animations Debug</h1>
        <p className="text-[var(--text-muted)] mt-1">Test all seasonal animations</p>
      </div>

      {/* Active Animation Preview */}
      {AnimationComponent && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden="true">
          <AnimationComponent />
        </div>
      )}

      {/* Controls */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Animation Controls</h2>
          {activeAnimation && (
            <Button variant="secondary" onClick={() => setActiveAnimation(null)}>
              Stop Animation
            </Button>
          )}
        </div>

        {activeAnimation && (
          <div className="mb-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <span className="text-[var(--text-secondary)]">Currently playing: </span>
            <Badge variant="success">{holidays.find(h => h.animation === activeAnimation)?.name || activeAnimation}</Badge>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {holidays.map((holiday) => {
            const Icon = holidayIcons[holiday.name] || Calendar
            const isActive = activeAnimation === holiday.animation
            
            return (
              <button
                key={holiday.name}
                onClick={() => setActiveAnimation(isActive ? null : holiday.animation)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isActive
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)] bg-[var(--bg-tertiary)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                  <div>
                    <div className={`font-medium ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                      {holiday.name}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {holiday.animation}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Holiday Schedule Reference */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Holiday Schedule</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-primary)]">
                <th className="text-left py-2 px-3 text-[var(--text-muted)]">Holiday</th>
                <th className="text-left py-2 px-3 text-[var(--text-muted)]">Animation</th>
                <th className="text-left py-2 px-3 text-[var(--text-muted)]">Date(s)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Christmas', animation: 'snowfall', dates: 'Dec 25 - Jan 5' },
                { name: 'Halloween', animation: 'ghosts', dates: 'Oct 29 - 31' },
                { name: 'New Year', animation: 'fireworks', dates: 'Dec 31 - Jan 1' },
                { name: 'Chinese New Year', animation: 'lanterns', dates: 'Varies (~15 days)' },
                { name: 'Diwali', animation: 'diyas', dates: 'Varies (~5 days, Oct/Nov)' },
                { name: "Valentine's Day", animation: 'hearts', dates: 'Feb 13 - 14' },
                { name: 'Qixi Festival', animation: 'magpies', dates: 'Varies (Jul/Aug)' },
                { name: 'Holi', animation: 'colorpowder', dates: 'Varies (Mar)' },
                { name: 'Easter', animation: 'eggs', dates: 'Varies (Mar/Apr)' },
                { name: 'Eid al-Fitr', animation: 'crescents', dates: 'Varies' },
                { name: "St. Patrick's Day", animation: 'clovers', dates: 'Mar 17' },
                { name: 'Mid-Autumn Festival', animation: 'mooncakes', dates: 'Varies (Sep/Oct)' },
                { name: 'Día de los Muertos', animation: 'marigolds', dates: 'Nov 1 - 2' },
                { name: 'Mardi Gras', animation: 'confetti', dates: 'Varies (Feb/Mar)' },
                { name: 'Carnival', animation: 'confetti', dates: 'Varies (Feb/Mar)' },
                { name: 'Songkran', animation: 'water', dates: 'Apr 13 - 15' },
                { name: 'Tanabata', animation: 'tanzaku', dates: 'Jul 7' },
                { name: 'Hanami', animation: 'sakura', dates: 'Apr 1 - 15' },
                { name: 'Oktoberfest', animation: 'pretzels', dates: 'Mid-Sep to early Oct' },
                { name: 'Chuseok', animation: 'mooncakes', dates: 'Varies (Sep/Oct, Korean)' },
                { name: 'Hanukkah', animation: 'candles', dates: 'Varies (~8 days, Nov/Dec)' },
                { name: 'Nowruz', animation: 'flowers', dates: 'Mar 20 - Apr 1 (Persian New Year)' },
                { name: 'Midsummer', animation: 'flowers', dates: 'Jun 21-22 (Scandinavian)' },
                { name: 'Maslenitsa', animation: 'confetti', dates: 'Varies (Russian spring)' },
                { name: 'Vesak', animation: 'lotus', dates: 'Varies (May, Buddhist)' },
                { name: 'Loi Krathong', animation: 'lanterns', dates: 'Varies (Nov, Thai)' },
                { name: 'Obon', animation: 'lanterns', dates: 'Aug 13-16 (Japanese)' },
              ].map((row) => (
                <tr key={row.name} className="border-b border-[var(--border-primary)]/50">
                  <td className="py-2 px-3 text-[var(--text-primary)]">{row.name}</td>
                  <td className="py-2 px-3">
                    <Badge variant="secondary">{row.animation}</Badge>
                  </td>
                  <td className="py-2 px-3 text-[var(--text-muted)]">{row.dates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
