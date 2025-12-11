import { useEffect, useState, useMemo } from 'react'

// ============================================================================
// HOLIDAY DEFINITIONS
// ============================================================================

interface Holiday {
  name: string
  check: (date: Date) => boolean
  animation: string
}

// Helper to get Easter date (Western) using Anonymous Gregorian algorithm
function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

// Helper for lunar new year (approximate - varies by year)
function getChineseNewYear(year: number): Date {
  // Chinese New Year falls between Jan 21 and Feb 20
  // These are approximate dates for recent/upcoming years
  const cnyDates: Record<number, [number, number]> = {
    2024: [1, 10], // Feb 10, 2024
    2025: [0, 29], // Jan 29, 2025
    2026: [1, 17], // Feb 17, 2026
    2027: [1, 6],  // Feb 6, 2027
    2028: [0, 26], // Jan 26, 2028
    2029: [1, 13], // Feb 13, 2029
    2030: [1, 3],  // Feb 3, 2030
  }
  const date = cnyDates[year] || [1, 1] // Default to Feb 1
  return new Date(year, date[0], date[1])
}

// Helper for Diwali (approximate - varies by year)
function getDiwaliDate(year: number): Date {
  // Diwali falls in October or November
  const diwaliDates: Record<number, [number, number]> = {
    2024: [10, 1],  // Nov 1, 2024
    2025: [9, 20],  // Oct 20, 2025
    2026: [10, 8],  // Nov 8, 2026
    2027: [9, 29],  // Oct 29, 2027
    2028: [9, 17],  // Oct 17, 2028
    2029: [10, 5],  // Nov 5, 2029
    2030: [9, 26],  // Oct 26, 2030
  }
  const date = diwaliDates[year] || [10, 1]
  return new Date(year, date[0], date[1])
}

// Helper for Qixi Festival (7th day of 7th lunar month)
function getQixiDate(year: number): Date {
  const qixiDates: Record<number, [number, number]> = {
    2024: [7, 10],  // Aug 10, 2024
    2025: [7, 29],  // Aug 29, 2025
    2026: [7, 19],  // Aug 19, 2026
    2027: [7, 8],   // Aug 8, 2027
    2028: [7, 26],  // Aug 26, 2028
    2029: [7, 16],  // Aug 16, 2029
    2030: [7, 5],   // Aug 5, 2030
  }
  const date = qixiDates[year] || [7, 15]
  return new Date(year, date[0], date[1])
}

// Helper for Holi (day after full moon in March)
function getHoliDate(year: number): Date {
  const holiDates: Record<number, [number, number]> = {
    2024: [2, 25],  // Mar 25, 2024
    2025: [2, 14],  // Mar 14, 2025
    2026: [2, 3],   // Mar 3, 2026
    2027: [2, 22],  // Mar 22, 2027
    2028: [2, 11],  // Mar 11, 2028
    2029: [2, 1],   // Mar 1, 2029
    2030: [2, 20],  // Mar 20, 2030
  }
  const date = holiDates[year] || [2, 15]
  return new Date(year, date[0], date[1])
}

// Helper for Eid al-Fitr (approximate)
function getEidDate(year: number): Date {
  const eidDates: Record<number, [number, number]> = {
    2024: [3, 10],  // Apr 10, 2024
    2025: [2, 30],  // Mar 30, 2025
    2026: [2, 20],  // Mar 20, 2026
    2027: [2, 9],   // Mar 9, 2027
    2028: [1, 26],  // Feb 26, 2028
    2029: [1, 14],  // Feb 14, 2029
    2030: [1, 4],   // Feb 4, 2030
  }
  const date = eidDates[year] || [3, 1]
  return new Date(year, date[0], date[1])
}

// Helper for Mid-Autumn Festival
function getMidAutumnDate(year: number): Date {
  const dates: Record<number, [number, number]> = {
    2024: [8, 17],  // Sep 17, 2024
    2025: [9, 6],   // Oct 6, 2025
    2026: [8, 25],  // Sep 25, 2026
    2027: [8, 15],  // Sep 15, 2027
    2028: [9, 3],   // Oct 3, 2028
    2029: [8, 22],  // Sep 22, 2029
    2030: [8, 12],  // Sep 12, 2030
  }
  const date = dates[year] || [8, 20]
  return new Date(year, date[0], date[1])
}

// Helper for Chuseok (Korean harvest festival - 15th day of 8th lunar month)
function getChuseokDate(year: number): Date {
  const dates: Record<number, [number, number]> = {
    2024: [8, 17],  // Sep 17, 2024
    2025: [9, 6],   // Oct 6, 2025
    2026: [8, 25],  // Sep 25, 2026
    2027: [8, 15],  // Sep 15, 2027
    2028: [9, 3],   // Oct 3, 2028
    2029: [8, 22],  // Sep 22, 2029
    2030: [8, 12],  // Sep 12, 2030
  }
  const date = dates[year] || [8, 20]
  return new Date(year, date[0], date[1])
}

// Helper for Hanukkah (25th of Kislev - varies in Nov/Dec)
function getHanukkahDate(year: number): Date {
  const dates: Record<number, [number, number]> = {
    2024: [11, 25], // Dec 25, 2024
    2025: [11, 14], // Dec 14, 2025
    2026: [11, 4],  // Dec 4, 2026
    2027: [11, 24], // Dec 24, 2027
    2028: [11, 12], // Dec 12, 2028
    2029: [11, 1],  // Dec 1, 2029
    2030: [11, 20], // Dec 20, 2030
  }
  const date = dates[year] || [11, 15]
  return new Date(year, date[0], date[1])
}

// Helper for Vesak/Buddha Day (full moon of Vesakha month)
function getVesakDate(year: number): Date {
  const dates: Record<number, [number, number]> = {
    2024: [4, 23],  // May 23, 2024
    2025: [4, 12],  // May 12, 2025
    2026: [4, 31],  // May 31, 2026
    2027: [4, 20],  // May 20, 2027
    2028: [4, 9],   // May 9, 2028
    2029: [4, 27],  // May 27, 2029
    2030: [4, 17],  // May 17, 2030
  }
  const date = dates[year] || [4, 15]
  return new Date(year, date[0], date[1])
}

// Check if date is within range of holiday (inclusive)
function isWithinDays(date: Date, holiday: Date, daysBefore: number, daysAfter: number): boolean {
  const start = new Date(holiday)
  start.setDate(start.getDate() - daysBefore)
  const end = new Date(holiday)
  end.setDate(end.getDate() + daysAfter)
  return date >= start && date <= end
}

// All holidays with their animations
const holidays: Holiday[] = [
  // ==================== USER REQUESTED ====================
  {
    name: 'Christmas',
    check: (date) => {
      const month = date.getMonth()
      const day = date.getDate()
      // 12 Days of Christmas: Dec 25 - Jan 5
      return (month === 11 && day >= 25) || (month === 0 && day <= 5)
    },
    animation: 'snowfall',
  },
  {
    name: 'Halloween',
    check: (date) => date.getMonth() === 9 && date.getDate() >= 29 && date.getDate() <= 31,
    animation: 'ghosts',
  },
  {
    name: 'New Year',
    check: (date) => {
      const month = date.getMonth()
      const day = date.getDate()
      return (month === 11 && day === 31) || (month === 0 && day === 1)
    },
    animation: 'fireworks',
  },
  {
    name: 'Chinese New Year',
    check: (date) => isWithinDays(date, getChineseNewYear(date.getFullYear()), 1, 14),
    animation: 'lanterns',
  },
  {
    name: 'Diwali',
    check: (date) => isWithinDays(date, getDiwaliDate(date.getFullYear()), 1, 4),
    animation: 'diyas',
  },
  {
    name: "Valentine's Day",
    check: (date) => date.getMonth() === 1 && date.getDate() >= 13 && date.getDate() <= 14,
    animation: 'hearts',
  },
  {
    name: 'Qixi Festival',
    check: (date) => isWithinDays(date, getQixiDate(date.getFullYear()), 0, 1),
    animation: 'magpies',
  },

  // ==================== 15 ADDITIONAL WORLDWIDE ====================
  {
    name: 'Holi',
    check: (date) => isWithinDays(date, getHoliDate(date.getFullYear()), 0, 1),
    animation: 'colorpowder',
  },
  {
    name: 'Easter',
    check: (date) => isWithinDays(date, getEasterDate(date.getFullYear()), 0, 1),
    animation: 'eggs',
  },
  {
    name: 'Eid al-Fitr',
    check: (date) => isWithinDays(date, getEidDate(date.getFullYear()), 0, 2),
    animation: 'crescents',
  },
  {
    name: 'St. Patrick\'s Day',
    check: (date) => date.getMonth() === 2 && date.getDate() === 17,
    animation: 'clovers',
  },
  {
    name: 'Mid-Autumn Festival',
    check: (date) => isWithinDays(date, getMidAutumnDate(date.getFullYear()), 0, 1),
    animation: 'mooncakes',
  },
  {
    name: 'Día de los Muertos',
    check: (date) => date.getMonth() === 10 && date.getDate() >= 1 && date.getDate() <= 2,
    animation: 'marigolds',
  },
  {
    name: 'Mardi Gras',
    check: (date) => {
      const easter = getEasterDate(date.getFullYear())
      const mardiGras = new Date(easter)
      mardiGras.setDate(mardiGras.getDate() - 47)
      return isWithinDays(date, mardiGras, 0, 0)
    },
    animation: 'confetti',
  },
  {
    name: 'Carnival',
    check: (date) => {
      const easter = getEasterDate(date.getFullYear())
      const carnival = new Date(easter)
      carnival.setDate(carnival.getDate() - 49) // Saturday before Ash Wednesday
      return isWithinDays(date, carnival, 0, 4)
    },
    animation: 'confetti',
  },
  {
    name: 'Songkran',
    check: (date) => date.getMonth() === 3 && date.getDate() >= 13 && date.getDate() <= 15,
    animation: 'water',
  },
  {
    name: 'Tanabata',
    check: (date) => date.getMonth() === 6 && date.getDate() === 7,
    animation: 'tanzaku',
  },
  {
    name: 'Hanami',
    check: (date) => date.getMonth() === 3 && date.getDate() >= 1 && date.getDate() <= 15,
    animation: 'sakura',
  },
  {
    name: 'Oktoberfest',
    check: (date) => {
      const month = date.getMonth()
      const day = date.getDate()
      return (month === 8 && day >= 16) || (month === 9 && day <= 3)
    },
    animation: 'pretzels',
  },
  // ==================== ADDITIONAL GLOBAL CELEBRATIONS ====================
  {
    name: 'Chuseok', // Korea - Harvest festival
    check: (date) => isWithinDays(date, getChuseokDate(date.getFullYear()), 1, 1),
    animation: 'mooncakes', // Similar moon theme
  },
  {
    name: 'Hanukkah', // Jewish - Festival of Lights
    check: (date) => isWithinDays(date, getHanukkahDate(date.getFullYear()), 0, 7),
    animation: 'candles',
  },
  {
    name: 'Nowruz', // Persian New Year - Iran, Central Asia, Balkans
    check: (date) => date.getMonth() === 2 && date.getDate() >= 20 && date.getDate() <= 22,
    animation: 'flowers',
  },
  {
    name: 'Midsummer', // Scandinavia - Midsommar
    check: (date) => date.getMonth() === 5 && date.getDate() >= 20 && date.getDate() <= 24,
    animation: 'flowers',
  },
  {
    name: 'Vesak', // Buddhist - Buddha's birthday (SE Asia, Sri Lanka, etc)
    check: (date) => isWithinDays(date, getVesakDate(date.getFullYear()), 0, 1),
    animation: 'lotus',
  },
  {
    name: 'Loi Krathong', // Thailand - Festival of Lights on water
    check: (date) => date.getMonth() === 10 && date.getDate() >= 15 && date.getDate() <= 17,
    animation: 'lanterns',
  },
  {
    name: 'Pongal', // South India - Harvest festival
    check: (date) => date.getMonth() === 0 && date.getDate() >= 14 && date.getDate() <= 17,
    animation: 'diyas',
  },
]

// ============================================================================
// ANIMATION COMPONENTS
// ============================================================================

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

// ==================== SNOWFALL ====================
function SnowfallAnimation() {
  const particles = useMemo(() => generateParticles(50), [])

  return (
    <>
      <style>{`
        @keyframes snowfall {
          0% { transform: translateY(-10px) translateX(0px) rotate(0deg); }
          25% { transform: translateY(25vh) translateX(var(--drift)) rotate(90deg); }
          50% { transform: translateY(50vh) translateX(0px) rotate(180deg); }
          75% { transform: translateY(75vh) translateX(calc(var(--drift) * -1)) rotate(270deg); }
          100% { transform: translateY(100vh) translateX(0px) rotate(360deg); }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `snowfall ${p.duration}s linear ${p.delay}s infinite`,
            '--drift': `${p.drift}px`,
            boxShadow: `0 0 ${p.size}px rgba(255, 255, 255, 0.5)`,
          } as React.CSSProperties}
        />
      ))}
    </>
  )
}

// ==================== GHOSTS (Halloween) ====================
function GhostsAnimation() {
  const particles = useMemo(() => generateParticles(15), [])

  return (
    <>
      <style>{`
        @keyframes ghostFloat {
          0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.7; }
          25% { transform: translateY(-30px) translateX(20px) scale(1.05); opacity: 0.9; }
          50% { transform: translateY(-10px) translateX(-15px) scale(0.95); opacity: 0.6; }
          75% { transform: translateY(-40px) translateX(10px) scale(1.02); opacity: 0.8; }
        }
        @keyframes ghostWobble {
          0%, 100% { transform: skewX(0deg); }
          25% { transform: skewX(3deg); }
          75% { transform: skewX(-3deg); }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 50) * 0.7 + 15}%`,
            animation: `ghostFloat ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite`,
          }}
        >
          <div
            style={{
              fontSize: `${p.size * 8}px`,
              opacity: p.opacity * 0.8,
              animation: `ghostWobble ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`,
              filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))',
            }}
          >
            👻
          </div>
        </div>
      ))}
    </>
  )
}

// ==================== FIREWORKS (New Year) ====================
function FireworksAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const [fireworks, setFireworks] = useState<Array<{
    id: number
    x: number
    y: number
    color: string
    particles: Array<{ angle: number; distance: number; size: number }>
  }>>([])

  useEffect(() => {
    const colors = ['#ff0000', '#00ff00', '#0066ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4', '#ffffff']
    
    const launchFirework = () => {
      const id = Date.now() + Math.random()
      const particleCount = 24 + Math.floor(Math.random() * 12)
      const particles = Array.from({ length: particleCount }, (_, i) => ({
        angle: (360 / particleCount) * i + (Math.random() - 0.5) * 15,
        distance: 30 + Math.random() * 40,
        size: 2 + Math.random() * 3,
      }))
      
      const newFirework = {
        id,
        x: 10 + Math.random() * 80,
        y: headerOnly ? 20 + Math.random() * 60 : 10 + Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        particles,
      }
      
      setFireworks(prev => [...prev, newFirework])
      
      setTimeout(() => {
        setFireworks(prev => prev.filter(f => f.id !== id))
      }, 1500)
    }

    // Launch fireworks randomly
    const interval = setInterval(() => {
      if (Math.random() > 0.4) launchFirework()
    }, 600)

    // Launch one immediately
    launchFirework()

    return () => clearInterval(interval)
  }, [headerOnly])

  return (
    <>
      <style>{`
        @keyframes fireworkExplode {
          0% { 
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% { 
            transform: translate(var(--tx), var(--ty)) scale(0.3);
            opacity: 0;
          }
        }
        @keyframes fireworkGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.5); }
        }
      `}</style>
      {fireworks.map((fw) => (
        <div
          key={fw.id}
          className="absolute"
          style={{
            left: `${fw.x}%`,
            top: `${fw.y}%`,
          }}
        >
          {/* Exploding particles */}
          {fw.particles.map((p, i) => {
            const rad = (p.angle * Math.PI) / 180
            const tx = Math.cos(rad) * p.distance
            const ty = Math.sin(rad) * p.distance
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  background: fw.color,
                  boxShadow: `0 0 ${p.size * 2}px ${fw.color}, 0 0 ${p.size * 4}px ${fw.color}`,
                  animation: `fireworkExplode 1.2s ease-out forwards, fireworkGlow 0.3s ease-in-out infinite`,
                  '--tx': `${tx}px`,
                  '--ty': `${ty}px`,
                } as React.CSSProperties}
              />
            )
          })}
        </div>
      ))}
    </>
  )
}

// ==================== LANTERNS (Chinese New Year) ====================
function LanternsAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 12 : 20, { 
    colors: ['#ff0000', '#ff3300', '#ff6600', '#ffcc00'] 
  }), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes lanternFloat {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        @keyframes lanternGlow {
          0%, 100% { filter: drop-shadow(0 0 8px var(--glow-color)); }
          50% { filter: drop-shadow(0 0 15px var(--glow-color)); }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 0) * 0.6 + 5}%`,
            fontSize: `${p.size * 6}px`,
            animation: `lanternFloat ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite, lanternGlow ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`,
            '--glow-color': p.color || '#ff0000',
            opacity: p.opacity,
          } as React.CSSProperties}
        >
          🏮
        </div>
      ))}
    </>
  )
}

// ==================== DIYAS (Diwali) ====================
function DiyasAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 15 : 30, {
    colors: ['#ff9900', '#ffcc00', '#ff6600']
  }), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes diyaFlicker {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.9; }
          25% { transform: scale(1.1) translateY(-2px); opacity: 1; }
          50% { transform: scale(0.95) translateY(1px); opacity: 0.85; }
          75% { transform: scale(1.05) translateY(-1px); opacity: 0.95; }
        }
        @keyframes diyaFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 50) * 0.7 + 20}%`,
            animation: `diyaFloat ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite`,
          }}
        >
          <div
            style={{
              fontSize: `${p.size * 5}px`,
              animation: `diyaFlicker ${1 + Math.random()}s ease-in-out infinite`,
              filter: `drop-shadow(0 0 ${p.size * 2}px ${p.color})`,
            }}
          >
            🪔
          </div>
        </div>
      ))}
      {/* Sparkle overlay */}
      {particles.slice(0, 15).map((p) => (
        <div
          key={`sparkle-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x + (Math.random() - 0.5) * 10}%`,
            top: `${(p.y || 50) * 0.7 + 15}%`,
            fontSize: `${p.size * 2}px`,
            animation: `diyaFlicker ${0.5 + Math.random() * 0.5}s ease-in-out ${p.delay}s infinite`,
            opacity: 0.7,
          }}
        >
          ✨
        </div>
      ))}
    </>
  )
}

// ==================== HEARTS (Valentine's Day) ====================
function HeartsAnimation() {
  const particles = useMemo(() => generateParticles(25, {
    colors: ['#ff1493', '#ff69b4', '#ff0066', '#ff3366', '#ff6699']
  }), [])

  return (
    <>
      <style>{`
        @keyframes heartFloat {
          0% { transform: translateY(100vh) translateX(0) scale(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; transform: translateY(90vh) scale(1); }
          90% { opacity: 1; }
          100% { transform: translateY(-10vh) translateX(var(--drift)) scale(0.5) rotate(var(--rotation)); opacity: 0; }
        }
        @keyframes heartPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            bottom: '-20px',
            fontSize: `${p.size * 5}px`,
            color: p.color,
            animation: `heartFloat ${p.duration}s ease-out ${p.delay}s infinite`,
            '--drift': `${p.drift}px`,
            '--rotation': `${(Math.random() - 0.5) * 40}deg`,
            filter: `drop-shadow(0 0 5px ${p.color})`,
          } as React.CSSProperties}
        >
          <span style={{ animation: `heartPulse ${1 + Math.random()}s ease-in-out infinite` }}>
            ❤️
          </span>
        </div>
      ))}
    </>
  )
}

// ==================== MAGPIES (Qixi Festival) ====================
function MagpiesAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 6 : 12), [headerOnly])
  const stars = useMemo(() => generateParticles(headerOnly ? 20 : 40), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes magpieFly {
          0%, 100% { transform: translateX(0) translateY(0) scaleX(1); }
          25% { transform: translateX(30px) translateY(-20px) scaleX(1); }
          50% { transform: translateX(0) translateY(-10px) scaleX(-1); }
          75% { transform: translateX(-30px) translateY(-25px) scaleX(-1); }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
      {/* Stars background */}
      {stars.map((s) => (
        <div
          key={`star-${s.id}`}
          className="absolute"
          style={{
            left: `${s.x}%`,
            top: `${(s.y || 0) * 0.8}%`,
            fontSize: `${s.size * 2}px`,
            animation: `starTwinkle ${2 + Math.random() * 2}s ease-in-out ${s.delay}s infinite`,
            opacity: s.opacity * 0.6,
          }}
        >
          ⭐
        </div>
      ))}
      {/* Magpies */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 0) * 0.5 + 10}%`,
            fontSize: `${p.size * 4}px`,
            animation: `magpieFly ${p.duration * 0.8}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity,
          }}
        >
          🐦‍⬛
        </div>
      ))}
    </>
  )
}

// ==================== COLOR POWDER (Holi) ====================
function ColorPowderAnimation() {
  const particles = useMemo(() => generateParticles(60, {
    colors: ['#ff0066', '#ff6600', '#ffff00', '#00ff00', '#00ccff', '#9900ff', '#ff00ff']
  }), [])

  return (
    <>
      <style>{`
        @keyframes powderBurst {
          0% { 
            transform: translateY(0) translateX(0) scale(0.5); 
            opacity: 0; 
          }
          10% { 
            opacity: 1; 
            transform: scale(1);
          }
          100% { 
            transform: translateY(calc(var(--end-y) * 1vh)) translateX(var(--drift)) scale(1.5); 
            opacity: 0; 
          }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: '0',
            width: `${p.size * 5}px`,
            height: `${p.size * 5}px`,
            background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
            animation: `powderBurst ${p.duration * 0.5}s ease-out ${p.delay}s infinite`,
            '--end-y': `${-30 - Math.random() * 60}`,
            '--drift': `${p.drift}px`,
            filter: `blur(${p.size * 0.8}px)`,
          } as React.CSSProperties}
        />
      ))}
    </>
  )
}

// ==================== EASTER EGGS ====================
function EggsAnimation() {
  const particles = useMemo(() => generateParticles(20, {
    variants: 6
  }), [])
  const eggEmojis = ['🥚', '🐣', '🐰', '🌷', '🦋', '🌸']

  return (
    <>
      <style>{`
        @keyframes eggBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-30px) rotate(10deg); }
          50% { transform: translateY(-15px) rotate(-5deg); }
          75% { transform: translateY(-40px) rotate(5deg); }
        }
        @keyframes eggWobble {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 50) * 0.6 + 25}%`,
            fontSize: `${p.size * 5}px`,
            animation: `eggBounce ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity,
          }}
        >
          <span style={{ animation: `eggWobble ${1 + Math.random()}s ease-in-out infinite` }}>
            {eggEmojis[p.variant || 0]}
          </span>
        </div>
      ))}
    </>
  )
}

// ==================== CRESCENTS (Eid) ====================
function CrescentsAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 15 : 25, {
    colors: ['#ffd700', '#fffacd', '#f0e68c']
  }), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes crescentGlow {
          0%, 100% { filter: drop-shadow(0 0 5px #ffd700); transform: scale(1); }
          50% { filter: drop-shadow(0 0 15px #ffd700); transform: scale(1.1); }
        }
        @keyframes crescentFloat {
          0%, 100% { transform: translateY(0) rotate(-10deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        @keyframes starShimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
      {/* Stars */}
      {particles.map((p) => (
        <div
          key={`star-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 0) * 0.7}%`,
            fontSize: `${p.size * 2}px`,
            animation: `starShimmer ${2 + Math.random() * 2}s ease-in-out ${p.delay}s infinite`,
            color: p.color,
          }}
        >
          ⭐
        </div>
      ))}
      {/* Crescents */}
      {particles.slice(0, 10).map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 0) * 0.5 + 10}%`,
            fontSize: `${p.size * 6}px`,
            animation: `crescentFloat ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite, crescentGlow ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity,
          }}
        >
          🌙
        </div>
      ))}
    </>
  )
}

// ==================== CLOVERS (St. Patrick's) ====================
function CloversAnimation() {
  const particles = useMemo(() => generateParticles(35, {
    colors: ['#00cc00', '#00ff00', '#228b22', '#32cd32']
  }), [])

  return (
    <>
      <style>{`
        @keyframes cloverFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes cloverSpin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            fontSize: `${p.size * 4}px`,
            color: p.color,
            animation: `cloverFall ${p.duration}s linear ${p.delay}s infinite`,
            filter: `drop-shadow(0 0 3px ${p.color})`,
          }}
        >
          ☘️
        </div>
      ))}
    </>
  )
}

// ==================== MOONCAKES (Mid-Autumn) ====================
function MooncakesAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 8 : 15), [headerOnly])
  const lanterns = useMemo(() => generateParticles(headerOnly ? 5 : 10), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes mooncakeGlow {
          0%, 100% { filter: drop-shadow(0 0 10px #ffd700); }
          50% { filter: drop-shadow(0 0 20px #ffcc00); }
        }
        @keyframes lanternSway {
          0%, 100% { transform: rotate(-5deg) translateY(0); }
          50% { transform: rotate(5deg) translateY(-10px); }
        }
      `}</style>
      {/* Big moon */}
      <div
        className="absolute"
        style={{
          right: '10%',
          top: '10%',
          fontSize: '80px',
          animation: 'mooncakeGlow 4s ease-in-out infinite',
          opacity: 0.9,
        }}
      >
        🌕
      </div>
      {/* Lanterns */}
      {lanterns.map((p) => (
        <div
          key={`lantern-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 0) * 0.4 + 5}%`,
            fontSize: `${p.size * 5}px`,
            animation: `lanternSway ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity,
          }}
        >
          🏮
        </div>
      ))}
      {/* Mooncakes floating */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 50) * 0.6 + 30}%`,
            fontSize: `${p.size * 4}px`,
            animation: `lanternSway ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity,
          }}
        >
          🥮
        </div>
      ))}
    </>
  )
}

// ==================== MARIGOLDS (Día de los Muertos) ====================
function MarigoldsAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 20 : 40, {
    colors: ['#ff6600', '#ff9900', '#ffcc00', '#ff3300']
  }), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes marigoldFall {
          0% { transform: translateY(-10px) rotate(0deg) scale(1); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(50vh) rotate(180deg) scale(0.9); }
          100% { transform: translateY(100vh) rotate(360deg) scale(0.7); opacity: 0.3; }
        }
        @keyframes skullGlow {
          0%, 100% { filter: drop-shadow(0 0 5px #ff6600); }
          50% { filter: drop-shadow(0 0 15px #ffcc00); }
        }
      `}</style>
      {/* Decorated skulls */}
      {particles.slice(0, 8).map((p) => (
        <div
          key={`skull-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 50) * 0.6 + 20}%`,
            fontSize: `${p.size * 5}px`,
            animation: `skullGlow ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity * 0.8,
          }}
        >
          💀
        </div>
      ))}
      {/* Marigold petals */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            fontSize: `${p.size * 3}px`,
            animation: `marigoldFall ${p.duration}s linear ${p.delay}s infinite`,
            filter: `drop-shadow(0 0 3px ${p.color})`,
          }}
        >
          🌼
        </div>
      ))}
    </>
  )
}

// ==================== CONFETTI (Mardi Gras / Carnival) ====================
function ConfettiAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 40 : 80, {
    colors: ['#9b4dca', '#ffd700', '#00a651', '#ff0066', '#00ccff', '#ff6600']
  }), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% { 
            transform: translateY(-20px) translateX(0) rotate(0deg); 
            opacity: 1; 
          }
          25% { 
            transform: translateY(25vh) translateX(var(--sway)) rotate(180deg); 
          }
          50% { 
            transform: translateY(50vh) translateX(calc(var(--sway) * -1)) rotate(360deg); 
          }
          75% { 
            transform: translateY(75vh) translateX(var(--sway)) rotate(540deg); 
          }
          100% { 
            transform: translateY(100vh) translateX(0) rotate(720deg); 
            opacity: 0.3; 
          }
        }
      `}</style>
      {/* Confetti pieces */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: `${p.size * 1.5}px`,
            height: `${p.size * 2.5}px`,
            background: p.color,
            animation: `confettiFall ${p.duration * 0.7}s linear ${p.delay}s infinite`,
            borderRadius: '1px',
            '--sway': `${(Math.random() - 0.5) * 30}px`,
            boxShadow: `0 0 2px ${p.color}`,
          } as React.CSSProperties}
        />
      ))}
      {/* Streamers */}
      {particles.slice(0, 20).map((p) => (
        <div
          key={`streamer-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x + 2}%`,
            top: '-30px',
            width: `${p.size * 0.8}px`,
            height: `${p.size * 6}px`,
            background: `linear-gradient(to bottom, ${p.color}, transparent)`,
            animation: `confettiFall ${p.duration * 0.9}s linear ${p.delay + 0.5}s infinite`,
            borderRadius: '2px',
            '--sway': `${(Math.random() - 0.5) * 40}px`,
            opacity: 0.8,
          } as React.CSSProperties}
        />
      ))}
      {/* Masks - only for full page */}
      {!headerOnly && particles.slice(0, 5).map((p) => (
        <div
          key={`mask-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 30) * 0.5 + 20}%`,
            fontSize: `${p.size * 6}px`,
            opacity: p.opacity * 0.7,
          }}
        >
          🎭
        </div>
      ))}
    </>
  )
}

// ==================== WATER (Songkran) ====================
function WaterAnimation() {
  const particles = useMemo(() => generateParticles(50, {
    colors: ['#00bfff', '#87ceeb', '#00ced1', '#40e0d0']
  }), [])

  return (
    <>
      <style>{`
        @keyframes waterSplash {
          0% { transform: translateY(var(--start-y)) scale(0); opacity: 0; }
          20% { opacity: 0.8; transform: scale(1); }
          100% { transform: translateY(calc(var(--start-y) + 100px)) scale(0.5); opacity: 0; }
        }
        @keyframes waterDrop {
          0% { transform: translateY(-20px) scale(1); opacity: 0; }
          10% { opacity: 0.8; }
          100% { transform: translateY(100vh) scale(0.5); opacity: 0; }
        }
        @keyframes elephantBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      {/* Water droplets */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            fontSize: `${p.size * 3}px`,
            animation: `waterDrop ${p.duration * 0.5}s linear ${p.delay}s infinite`,
            color: p.color,
            filter: `drop-shadow(0 0 3px ${p.color})`,
          }}
        >
          💧
        </div>
      ))}
      {/* Splash effects */}
      {particles.slice(0, 15).map((p) => (
        <div
          key={`splash-${p.id}`}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            width: `${p.size * 8}px`,
            height: `${p.size * 4}px`,
            background: `radial-gradient(ellipse, ${p.color}60 0%, transparent 70%)`,
            animation: `waterSplash ${p.duration * 0.4}s ease-out ${p.delay}s infinite`,
            '--start-y': `${(p.y || 50) + 30}vh`,
          } as React.CSSProperties}
        />
      ))}
    </>
  )
}

// ==================== TANZAKU (Tanabata) ====================
function TanzakuAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 12 : 25, {
    colors: ['#ff69b4', '#87ceeb', '#98fb98', '#dda0dd', '#f0e68c', '#ffb6c1']
  }), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes tanzakuSway {
          0%, 100% { transform: rotate(-10deg) translateY(0); }
          50% { transform: rotate(10deg) translateY(5px); }
        }
        @keyframes bambooSway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
      `}</style>
      {/* Bamboo decorations */}
      {particles.slice(0, 8).map((p) => (
        <div
          key={`bamboo-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '0',
            fontSize: '40px',
            animation: `bambooSway ${3 + Math.random() * 2}s ease-in-out infinite`,
            opacity: 0.6,
          }}
        >
          🎋
        </div>
      ))}
      {/* Tanzaku (wish papers) */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 0) * 0.4 + 10}%`,
            width: `${p.size * 3}px`,
            height: `${p.size * 8}px`,
            background: p.color,
            borderRadius: '2px',
            animation: `tanzakuSway ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`,
            boxShadow: `0 2px 4px rgba(0,0,0,0.2)`,
          }}
        />
      ))}
      {/* Stars */}
      {particles.slice(0, 15).map((p) => (
        <div
          key={`star-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x + 5}%`,
            top: `${(p.y || 0) * 0.3}%`,
            fontSize: `${p.size * 2}px`,
            opacity: p.opacity * 0.7,
          }}
        >
          ⭐
        </div>
      ))}
    </>
  )
}

// ==================== SAKURA (Hanami) ====================
function SakuraAnimation() {
  const particles = useMemo(() => generateParticles(50, {
    colors: ['#ffb7c5', '#ffc0cb', '#ff69b4', '#ffb6c1', '#fff0f5']
  }), [])

  return (
    <>
      <style>{`
        @keyframes sakuraFall {
          0% { transform: translateY(-10px) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(100vh) translateX(var(--drift)) rotate(360deg); opacity: 0.3; }
        }
        @keyframes sakuraSway {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(20px) rotate(10deg); }
          75% { transform: translateX(-20px) rotate(-10deg); }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            fontSize: `${p.size * 3}px`,
            animation: `sakuraFall ${p.duration}s linear ${p.delay}s infinite, sakuraSway ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite`,
            '--drift': `${p.drift}px`,
            filter: `drop-shadow(0 0 2px ${p.color})`,
          } as React.CSSProperties}
        >
          🌸
        </div>
      ))}
    </>
  )
}

// ==================== PRETZELS (Oktoberfest) ====================
function PretzelsAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 10 : 20), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes pretzelFloat {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes beerFoam {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
      {/* Beer mugs */}
      {particles.slice(0, 8).map((p) => (
        <div
          key={`beer-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 50) * 0.5 + 30}%`,
            fontSize: `${p.size * 5}px`,
            animation: `beerFoam ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity,
          }}
        >
          🍺
        </div>
      ))}
      {/* Pretzels */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 30) * 0.6 + 15}%`,
            fontSize: `${p.size * 4}px`,
            animation: `pretzelFloat ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity,
          }}
        >
          🥨
        </div>
      ))}
      {/* Leaves */}
      {particles.slice(0, 15).map((p) => (
        <div
          key={`leaf-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x + 3}%`,
            top: `${(p.y || 0) * 0.4}%`,
            fontSize: `${p.size * 2}px`,
            opacity: p.opacity * 0.5,
          }}
        >
          🍂
        </div>
      ))}
    </>
  )
}

// ==================== CANDLES (Hanukkah) ====================
function CandlesAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 20 : 35, {
    colors: ['#1e40af', '#3b82f6', '#93c5fd', '#ffffff', '#ffd700']
  }), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes candleGlow {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.05); filter: brightness(1.3); }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: scaleY(1) translateY(0); opacity: 1; }
          25% { transform: scaleY(1.1) translateY(-2px); opacity: 0.9; }
          50% { transform: scaleY(0.95) translateY(1px); opacity: 1; }
          75% { transform: scaleY(1.05) translateY(-1px); opacity: 0.85; }
        }
        @keyframes starOfDavid {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
        }
      `}</style>
      {/* Menorah candles */}
      {particles.slice(0, 9).map((p, i) => (
        <div
          key={`candle-${p.id}`}
          className="absolute"
          style={{
            left: `${10 + i * 10}%`,
            bottom: '20%',
            fontSize: `${p.size * 5}px`,
            animation: `candleGlow ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`,
          }}
        >
          🕯️
        </div>
      ))}
      {/* Stars of David floating */}
      {particles.slice(9, 20).map((p) => (
        <div
          key={`star-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 20) * 0.6}%`,
            fontSize: `${p.size * 3}px`,
            animation: `starOfDavid ${p.duration}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity * 0.7,
            color: p.color,
          }}
        >
          ✡️
        </div>
      ))}
      {/* Sparkles */}
      {particles.slice(20).map((p) => (
        <div
          key={`sparkle-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 30) * 0.7}%`,
            fontSize: `${p.size * 2}px`,
            animation: `flameFlicker ${0.5 + Math.random() * 0.5}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity,
            color: '#ffd700',
          }}
        >
          ✨
        </div>
      ))}
    </>
  )
}

// ==================== FLOWERS (Nowruz, Midsummer) ====================
function FlowersAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 25 : 50, {
    colors: ['#ff69b4', '#ff1493', '#ff6347', '#ffa500', '#ffff00', '#9acd32', '#00fa9a', '#87ceeb']
  }), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes flowerFloat {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-10vh) rotate(360deg); opacity: 0; }
        }
        @keyframes flowerSway {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
        @keyframes petalFall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(50px) rotate(720deg); opacity: 0.5; }
        }
      `}</style>
      {/* Floating flowers */}
      {particles.slice(0, 25).map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            bottom: '-20px',
            fontSize: `${p.size * 3}px`,
            animation: `flowerFloat ${p.duration}s ease-out ${p.delay}s infinite`,
          }}
        >
          {['🌸', '🌺', '🌻', '🌷', '🌼', '💐', '🪻', '🌹'][p.id % 8]}
        </div>
      ))}
      {/* Swaying flowers at different positions */}
      {particles.slice(25, 40).map((p) => (
        <div
          key={`sway-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 40) * 0.7 + 15}%`,
            fontSize: `${p.size * 4}px`,
            animation: `flowerSway ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity * 0.8,
          }}
        >
          {['🌸', '🌺', '🌻', '🌷'][p.id % 4]}
        </div>
      ))}
      {/* Falling petals */}
      {particles.slice(40).map((p) => (
        <div
          key={`petal-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-5%',
            fontSize: `${p.size * 2}px`,
            animation: `petalFall ${p.duration * 1.5}s ease-in ${p.delay}s infinite`,
            opacity: p.opacity,
            color: p.color,
          }}
        >
          🌸
        </div>
      ))}
    </>
  )
}

// ==================== LOTUS (Vesak - Buddhist) ====================
function LotusAnimation({ headerOnly = false }: { headerOnly?: boolean }) {
  const particles = useMemo(() => generateParticles(headerOnly ? 20 : 40, {
    colors: ['#ff69b4', '#ffffff', '#ffd700', '#87ceeb', '#dda0dd']
  }), [headerOnly])

  return (
    <>
      <style>{`
        @keyframes lotusFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.05); }
        }
        @keyframes lotusGlow {
          0%, 100% { filter: drop-shadow(0 0 5px #ff69b4); }
          50% { filter: drop-shadow(0 0 15px #ffd700); }
        }
        @keyframes wheelSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes candleFlicker {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
      `}</style>
      {/* Dharma wheels */}
      {particles.slice(0, 5).map((p) => (
        <div
          key={`wheel-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 20) * 0.3 + 5}%`,
            fontSize: `${p.size * 5}px`,
            animation: `wheelSpin ${p.duration * 2}s linear ${p.delay}s infinite`,
            opacity: p.opacity * 0.6,
          }}
        >
          ☸️
        </div>
      ))}
      {/* Floating lotus flowers */}
      {particles.slice(5, 20).map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 40) * 0.5 + 25}%`,
            fontSize: `${p.size * 4}px`,
            animation: `lotusFloat ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite, lotusGlow ${p.duration * 0.4}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity,
          }}
        >
          🪷
        </div>
      ))}
      {/* Candles/lights */}
      {particles.slice(20, 30).map((p) => (
        <div
          key={`candle-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            bottom: '10%',
            fontSize: `${p.size * 3}px`,
            animation: `candleFlicker ${0.5 + Math.random() * 0.5}s ease-in-out ${p.delay}s infinite`,
          }}
        >
          🕯️
        </div>
      ))}
      {/* Sparkles representing enlightenment */}
      {particles.slice(30).map((p) => (
        <div
          key={`light-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 30) * 0.7}%`,
            fontSize: `${p.size * 2}px`,
            animation: `lotusGlow ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity,
          }}
        >
          ✨
        </div>
      ))}
    </>
  )
}

// ==================== RAINBOW (Pride) ====================
function RainbowAnimation() {
  const particles = useMemo(() => generateParticles(60, {
    colors: ['#ff0000', '#ff8c00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff']
  }), [])

  return (
    <>
      <style>{`
        @keyframes rainbowFloat {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; transform: scale(1); }
          100% { transform: translateY(-20vh) scale(0.8); opacity: 0; }
        }
        @keyframes rainbowPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }
        @keyframes flagWave {
          0%, 100% { transform: rotate(-5deg) scaleX(1); }
          50% { transform: rotate(5deg) scaleX(0.95); }
        }
      `}</style>
      {/* Rainbow arc */}
      <div
        className="absolute"
        style={{
          left: '20%',
          top: '5%',
          fontSize: '60px',
          opacity: 0.6,
          animation: 'rainbowPulse 3s ease-in-out infinite',
        }}
      >
        🌈
      </div>
      {/* Floating hearts in rainbow colors */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            bottom: '-20px',
            fontSize: `${p.size * 3}px`,
            animation: `rainbowFloat ${p.duration}s ease-out ${p.delay}s infinite`,
            filter: `drop-shadow(0 0 3px ${p.color})`,
          }}
        >
          <span style={{ color: p.color }}>❤️</span>
        </div>
      ))}
      {/* Pride flags */}
      {particles.slice(0, 5).map((p) => (
        <div
          key={`flag-${p.id}`}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${(p.y || 30) * 0.5 + 10}%`,
            fontSize: `${p.size * 6}px`,
            animation: `flagWave ${p.duration * 0.3}s ease-in-out ${p.delay}s infinite`,
            opacity: p.opacity * 0.8,
          }}
        >
          🏳️‍🌈
        </div>
      ))}
    </>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Animations that should only show in the header area
const headerOnlyAnimations = new Set([
  'fireworks',
  'lanterns', 
  'magpies',
  'diyas',
  'marigolds',
  'tanzaku',
  'pretzels',
  'mooncakes',
  'candles',
  'crescents',
  'flowers',
  'lotus',
])

// Full-page animation components
const animationComponents: Record<string, React.FC<{ headerOnly?: boolean }>> = {
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

// Hook to get current active holiday (for use in sidebar, etc)
export function useActiveHoliday(): Holiday | null {
  const [activeHoliday, setActiveHoliday] = useState<Holiday | null>(null)

  useEffect(() => {
    const checkHoliday = () => {
      const today = new Date()
      const holiday = holidays.find(h => h.check(today))
      setActiveHoliday(holiday || null)
    }

    checkHoliday()
    const interval = setInterval(checkHoliday, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return activeHoliday
}

// Check if we should show moon in sidebar (for moon-related holidays)
export function useShouldShowMoon(): boolean {
  const holiday = useActiveHoliday()
  return holiday?.animation === 'mooncakes'
}

// Main seasonal animations - only renders full-page animations
export function SeasonalAnimations() {
  const [activeHoliday, setActiveHoliday] = useState<Holiday | null>(null)

  useEffect(() => {
    const checkHoliday = () => {
      const today = new Date()
      const holiday = holidays.find(h => h.check(today))
      setActiveHoliday(holiday || null)
    }

    checkHoliday()
    const interval = setInterval(checkHoliday, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Don't render if no holiday or if it's a header-only animation
  if (!activeHoliday || headerOnlyAnimations.has(activeHoliday.animation)) return null

  const AnimationComponent = animationComponents[activeHoliday.animation]
  if (!AnimationComponent) return null

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
      title={`Celebrating ${activeHoliday.name}!`}
    >
      <AnimationComponent />
    </div>
  )
}

// Header-only animations component - renders in header area only
export function HeaderSeasonalAnimations() {
  const [activeHoliday, setActiveHoliday] = useState<Holiday | null>(null)

  useEffect(() => {
    const checkHoliday = () => {
      const today = new Date()
      const holiday = holidays.find(h => h.check(today))
      setActiveHoliday(holiday || null)
    }

    checkHoliday()
    const interval = setInterval(checkHoliday, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Only render header-only animations
  if (!activeHoliday || !headerOnlyAnimations.has(activeHoliday.animation)) return null

  const AnimationComponent = animationComponents[activeHoliday.animation]
  if (!AnimationComponent) return null

  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
      title={`Celebrating ${activeHoliday.name}!`}
    >
      <AnimationComponent headerOnly />
    </div>
  )
}

// Export the holidays list for reference
export { holidays }
