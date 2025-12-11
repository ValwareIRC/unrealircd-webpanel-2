import { useMemo, useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Globe, Users, MapPin, Loader2 } from 'lucide-react'
import { Alert } from '@/components/common'
import { useIRCUsers } from '@/hooks'

// Country coordinates (lat, lng) for placing markers
const countryCoordinates: Record<string, { lat: number; lng: number; name: string }> = {
  AF: { lat: 33.93911, lng: 67.709953, name: 'Afghanistan' },
  AL: { lat: 41.153332, lng: 20.168331, name: 'Albania' },
  DZ: { lat: 28.033886, lng: 1.659626, name: 'Algeria' },
  AR: { lat: -38.416097, lng: -63.616672, name: 'Argentina' },
  AM: { lat: 40.069099, lng: 45.038189, name: 'Armenia' },
  AU: { lat: -25.274398, lng: 133.775136, name: 'Australia' },
  AT: { lat: 47.516231, lng: 14.550072, name: 'Austria' },
  AZ: { lat: 40.143105, lng: 47.576927, name: 'Azerbaijan' },
  BD: { lat: 23.684994, lng: 90.356331, name: 'Bangladesh' },
  BY: { lat: 53.709807, lng: 27.953389, name: 'Belarus' },
  BE: { lat: 50.503887, lng: 4.469936, name: 'Belgium' },
  BA: { lat: 43.915886, lng: 17.679076, name: 'Bosnia and Herzegovina' },
  BR: { lat: -14.235004, lng: -51.92528, name: 'Brazil' },
  BG: { lat: 42.733883, lng: 25.48583, name: 'Bulgaria' },
  CA: { lat: 56.130366, lng: -106.346771, name: 'Canada' },
  CL: { lat: -35.675147, lng: -71.542969, name: 'Chile' },
  CN: { lat: 35.86166, lng: 104.195397, name: 'China' },
  CO: { lat: 4.570868, lng: -74.297333, name: 'Colombia' },
  HR: { lat: 45.1, lng: 15.2, name: 'Croatia' },
  CZ: { lat: 49.817492, lng: 15.472962, name: 'Czech Republic' },
  DK: { lat: 56.26392, lng: 9.501785, name: 'Denmark' },
  EC: { lat: -1.831239, lng: -78.183406, name: 'Ecuador' },
  EG: { lat: 26.820553, lng: 30.802498, name: 'Egypt' },
  EE: { lat: 58.595272, lng: 25.013607, name: 'Estonia' },
  FI: { lat: 61.92411, lng: 25.748151, name: 'Finland' },
  FR: { lat: 46.227638, lng: 2.213749, name: 'France' },
  GE: { lat: 42.315407, lng: 43.356892, name: 'Georgia' },
  DE: { lat: 51.165691, lng: 10.451526, name: 'Germany' },
  GR: { lat: 39.074208, lng: 21.824312, name: 'Greece' },
  HK: { lat: 22.396428, lng: 114.109497, name: 'Hong Kong' },
  HU: { lat: 47.162494, lng: 19.503304, name: 'Hungary' },
  IS: { lat: 64.963051, lng: -19.020835, name: 'Iceland' },
  IN: { lat: 20.593684, lng: 78.96288, name: 'India' },
  ID: { lat: -0.789275, lng: 113.921327, name: 'Indonesia' },
  IR: { lat: 32.427908, lng: 53.688046, name: 'Iran' },
  IQ: { lat: 33.223191, lng: 43.679291, name: 'Iraq' },
  IE: { lat: 53.41291, lng: -8.24389, name: 'Ireland' },
  IL: { lat: 31.046051, lng: 34.851612, name: 'Israel' },
  IT: { lat: 41.87194, lng: 12.56738, name: 'Italy' },
  JP: { lat: 36.204824, lng: 138.252924, name: 'Japan' },
  KZ: { lat: 48.019573, lng: 66.923684, name: 'Kazakhstan' },
  KE: { lat: -0.023559, lng: 37.906193, name: 'Kenya' },
  KR: { lat: 35.907757, lng: 127.766922, name: 'South Korea' },
  KW: { lat: 29.31166, lng: 47.481766, name: 'Kuwait' },
  LV: { lat: 56.879635, lng: 24.603189, name: 'Latvia' },
  LB: { lat: 33.854721, lng: 35.862285, name: 'Lebanon' },
  LT: { lat: 55.169438, lng: 23.881275, name: 'Lithuania' },
  LU: { lat: 49.815273, lng: 6.129583, name: 'Luxembourg' },
  MY: { lat: 4.210484, lng: 101.975766, name: 'Malaysia' },
  MX: { lat: 23.634501, lng: -102.552784, name: 'Mexico' },
  MD: { lat: 47.411631, lng: 28.369885, name: 'Moldova' },
  MA: { lat: 31.791702, lng: -7.09262, name: 'Morocco' },
  NL: { lat: 52.132633, lng: 5.291266, name: 'Netherlands' },
  NZ: { lat: -40.900557, lng: 174.885971, name: 'New Zealand' },
  NG: { lat: 9.081999, lng: 8.675277, name: 'Nigeria' },
  NO: { lat: 60.472024, lng: 8.468946, name: 'Norway' },
  PK: { lat: 30.375321, lng: 69.345116, name: 'Pakistan' },
  PE: { lat: -9.189967, lng: -75.015152, name: 'Peru' },
  PH: { lat: 12.879721, lng: 121.774017, name: 'Philippines' },
  PL: { lat: 51.919438, lng: 19.145136, name: 'Poland' },
  PT: { lat: 39.399872, lng: -8.224454, name: 'Portugal' },
  QA: { lat: 25.354826, lng: 51.183884, name: 'Qatar' },
  RO: { lat: 45.943161, lng: 24.96676, name: 'Romania' },
  RU: { lat: 61.52401, lng: 105.318756, name: 'Russia' },
  SA: { lat: 23.885942, lng: 45.079162, name: 'Saudi Arabia' },
  RS: { lat: 44.016521, lng: 21.005859, name: 'Serbia' },
  SG: { lat: 1.352083, lng: 103.819836, name: 'Singapore' },
  SK: { lat: 48.669026, lng: 19.699024, name: 'Slovakia' },
  SI: { lat: 46.151241, lng: 14.995463, name: 'Slovenia' },
  ZA: { lat: -30.559482, lng: 22.937506, name: 'South Africa' },
  ES: { lat: 40.463667, lng: -3.74922, name: 'Spain' },
  SE: { lat: 60.128161, lng: 18.643501, name: 'Sweden' },
  CH: { lat: 46.818188, lng: 8.227512, name: 'Switzerland' },
  TW: { lat: 23.69781, lng: 120.960515, name: 'Taiwan' },
  TH: { lat: 15.870032, lng: 100.992541, name: 'Thailand' },
  TR: { lat: 38.963745, lng: 35.243322, name: 'Turkey' },
  UA: { lat: 48.379433, lng: 31.16558, name: 'Ukraine' },
  AE: { lat: 23.424076, lng: 53.847818, name: 'United Arab Emirates' },
  GB: { lat: 55.378051, lng: -3.435973, name: 'United Kingdom' },
  US: { lat: 37.09024, lng: -95.712891, name: 'United States' },
  VE: { lat: 6.42375, lng: -66.58973, name: 'Venezuela' },
  VN: { lat: 14.058324, lng: 108.277199, name: 'Vietnam' },
}

// Convert lat/lng to 3D position on sphere
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  
  return new THREE.Vector3(x, y, z)
}

// Earth globe component (no rotation - parent group handles it)
function Earth() {
  // Use NASA Blue Marble daytime texture
  const texture = useTexture('https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg')
  
  // Ensure texture is properly configured
  texture.colorSpace = THREE.SRGBColorSpace

  return (
    <mesh>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        metalness={0.1}
        roughness={0.7}
      />
    </mesh>
  )
}

// Fallback Earth (shown while texture loads)
function EarthFallback() {
  return (
    <mesh>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        color="#1a4a7a"
        metalness={0.1}
        roughness={0.7}
      />
    </mesh>
  )
}

// Atmosphere glow
function Atmosphere() {
  return (
    <mesh scale={[1.05, 1.05, 1.05]}>
      <sphereGeometry args={[2, 64, 64]} />
      <shaderMaterial
        transparent
        side={THREE.BackSide}
        uniforms={{
          glowColor: { value: new THREE.Color(0x00aaff) },
        }}
        vertexShader={`
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 glowColor;
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(glowColor, intensity * 0.4);
          }
        `}
      />
    </mesh>
  )
}

// Country marker (pin on the globe)
function CountryMarker({ 
  countryCode, 
  count, 
  maxCount,
  position 
}: { 
  countryCode: string
  count: number
  maxCount: number
  position: THREE.Vector3
}) {
  const [hovered, setHovered] = useState(false)
  const markerRef = useRef<THREE.Group>(null)
  const country = countryCoordinates[countryCode]
  
  // Scale based on user count
  const scale = 0.03 + (count / maxCount) * 0.12
  const intensity = 0.3 + (count / maxCount) * 0.7
  
  // Pulse animation
  useFrame((state) => {
    if (markerRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      markerRef.current.scale.setScalar(hovered ? scale * 1.5 : scale * pulse)
    }
  })

  return (
    <group position={position}>
      <group 
        ref={markerRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Marker sphere */}
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial 
            color={new THREE.Color().setHSL(0.55, 1, intensity)} 
            transparent 
            opacity={0.9}
          />
        </mesh>
        
        {/* Outer glow ring */}
        <mesh>
          <ringGeometry args={[1.2, 1.8, 32]} />
          <meshBasicMaterial 
            color={new THREE.Color().setHSL(0.55, 1, intensity)} 
            transparent 
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Tooltip on hover */}
        {hovered && (
          <Html distanceFactor={10}>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-2 shadow-lg whitespace-nowrap pointer-events-none">
              <div className="font-semibold text-[var(--text-primary)]">
                {country?.name || countryCode}
              </div>
              <div className="text-sm text-[var(--accent)]">
                {count} user{count !== 1 ? 's' : ''}
              </div>
            </div>
          </Html>
        )}
      </group>
      
      {/* Beam from surface */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.005, 0.02, 0.3, 8]} />
        <meshBasicMaterial 
          color={new THREE.Color().setHSL(0.55, 1, 0.7)} 
          transparent 
          opacity={0.6}
        />
      </mesh>
    </group>
  )
}

// Main scene component
function GlobeScene({ countryData, maxCount }: { countryData: Map<string, number>; maxCount: number }) {
  const { camera } = useThree()
  
  // Position camera
  useEffect(() => {
    camera.position.set(0, 0, 6)
  }, [camera])

  // Create markers for each country with users
  const markers = useMemo(() => {
    const result: JSX.Element[] = []
    
    countryData.forEach((count, code) => {
      const coords = countryCoordinates[code]
      if (coords) {
        const position = latLngToVector3(coords.lat, coords.lng, 2.05)
        result.push(
          <CountryMarker
            key={code}
            countryCode={code}
            count={count}
            maxCount={maxCount}
            position={position}
          />
        )
      }
    })
    
    return result
  }, [countryData, maxCount])

  // Rotating group ref
  const globeGroupRef = useRef<THREE.Group>(null)
  
  // Slow rotation for the entire globe + markers
  useFrame(() => {
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += 0.001
    }
  })

  return (
    <>
      {/* Lighting - bright enough to see the globe clearly */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 3, 5]} intensity={2} />
      <directionalLight position={[-5, -3, -5]} intensity={0.5} />
      
      {/* Stars background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Rotating group containing Earth, atmosphere, and markers */}
      <group ref={globeGroupRef}>
        {/* Earth with suspense fallback */}
        <Suspense fallback={<EarthFallback />}>
          <Earth />
        </Suspense>
        
        {/* Atmosphere glow */}
        <Atmosphere />
        
        {/* Country markers */}
        {markers}
      </group>
      
      {/* Controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={10}
        rotateSpeed={0.5}
        zoomSpeed={0.5}
      />
    </>
  )
}

// Loading fallback
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
        <Loader2 className="animate-spin" size={32} />
        <span>Loading globe...</span>
      </div>
    </Html>
  )
}

export default function LiveMapPage() {
  const { data: users, isLoading, error } = useIRCUsers()

  // Aggregate users by country
  const { countryData, totalUsers, uniqueCountries, sortedCountries } = useMemo(() => {
    const countryMap = new Map<string, number>()
    let total = 0

    // Aggregate real users by country
    if (users) {
      users.forEach(user => {
        const countryCode = user.geoip?.country_code
        if (countryCode) {
          countryMap.set(countryCode, (countryMap.get(countryCode) || 0) + 1)
          total++
        }
      })
    }

    const sorted = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])

    return {
      countryData: countryMap,
      totalUsers: total,
      uniqueCountries: countryMap.size,
      sortedCountries: sorted
    }
  }, [users])

  const maxCount = sortedCountries.length > 0 ? sortedCountries[0][1] : 1

  if (error) {
    return (
      <div className="p-6">
        <Alert type="error">Failed to load user data: {String(error)}</Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-primary)] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-muted)] rounded-lg">
              <Globe className="text-[var(--accent)]" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Live Map</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                User distribution across the globe
              </p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Users size={18} />
              <span className="text-[var(--text-primary)] font-semibold">{totalUsers}</span>
              <span>users</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <MapPin size={18} />
              <span className="text-[var(--text-primary)] font-semibold">{uniqueCountries}</span>
              <span>countries</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* 3D Globe */}
        <div className="flex-1 relative bg-[#0a0a15] min-h-[400px]">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-[var(--accent)]" size={48} />
            </div>
          ) : (
            <Canvas
              style={{ width: '100%', height: '100%' }}
              camera={{ position: [0, 0, 6], fov: 45 }}
            >
              <Suspense fallback={<LoadingFallback />}>
                <GlobeScene countryData={countryData} maxCount={maxCount} />
              </Suspense>
            </Canvas>
          )}
          
          {/* Controls overlay */}
          <div className="absolute bottom-4 left-4 text-xs text-[var(--text-muted)] bg-black/50 px-3 py-2 rounded-lg">
            <div>🖱️ Drag to rotate</div>
            <div>🔍 Scroll to zoom</div>
          </div>
        </div>

        {/* Sidebar - Top countries */}
        <div className="w-72 border-l border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto">
          <div className="p-4">
            <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-[var(--accent)]" />
              Top Countries
            </h2>
            
            {sortedCountries.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No geo-location data available
              </p>
            ) : (
              <div className="space-y-2">
                {sortedCountries.slice(0, 15).map(([code, count], index) => {
                  const country = countryCoordinates[code]
                  const percentage = ((count / totalUsers) * 100).toFixed(1)
                  const barWidth = (count / maxCount) * 100
                  
                  return (
                    <div key={code} className="group">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-muted)] w-5">{index + 1}.</span>
                          <span className="text-[var(--text-primary)]">
                            {country?.name || code}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--accent)] font-medium">{count}</span>
                          <span className="text-[var(--text-muted)] text-xs">({percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] rounded-full transition-all duration-300"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            {sortedCountries.length > 15 && (
              <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
                +{sortedCountries.length - 15} more countries
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
