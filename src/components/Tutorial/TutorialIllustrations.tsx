import { ReactNode } from 'react';

interface IllustrationProps {
  className?: string;
}

// Shared wrapper for consistent sizing
function IllustrationWrapper({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
}

// Welcome illustration - House with sparkles
export function WelcomeIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper className={className}>
      <svg viewBox="0 0 200 160" className="w-48 h-40" fill="none">
        {/* Background circle */}
        <circle cx="100" cy="80" r="70" fill="#EFF6FF" />
        
        {/* House body */}
        <rect x="55" y="75" width="90" height="65" rx="4" fill="#1D4ED8" />
        
        {/* Roof */}
        <path d="M40 80 L100 35 L160 80" stroke="#1E40AF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M45 78 L100 38 L155 78" fill="#3B82F6" />
        
        {/* Door */}
        <rect x="85" y="100" width="30" height="40" rx="2" fill="#FCD34D" />
        <circle cx="108" cy="122" r="3" fill="#B45309" />
        
        {/* Windows */}
        <rect x="60" y="85" width="20" height="20" rx="2" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="2" />
        <line x1="70" y1="85" x2="70" y2="105" stroke="#93C5FD" strokeWidth="2" />
        <line x1="60" y1="95" x2="80" y2="95" stroke="#93C5FD" strokeWidth="2" />
        
        <rect x="120" y="85" width="20" height="20" rx="2" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="2" />
        <line x1="130" y1="85" x2="130" y2="105" stroke="#93C5FD" strokeWidth="2" />
        <line x1="120" y1="95" x2="140" y2="95" stroke="#93C5FD" strokeWidth="2" />
        
        {/* Chimney */}
        <rect x="125" y="45" width="15" height="25" fill="#1E40AF" />
        
        {/* Sparkles */}
        <g className="animate-pulse">
          <path d="M170 50 L173 55 L178 55 L174 59 L176 65 L170 61 L164 65 L166 59 L162 55 L167 55 Z" fill="#FCD34D" />
          <path d="M35 45 L37 48 L41 48 L38 51 L39 55 L35 52 L31 55 L32 51 L29 48 L33 48 Z" fill="#FCD34D" />
          <path d="M50 100 L51.5 103 L55 103 L52.5 105.5 L53.5 109 L50 106.5 L46.5 109 L47.5 105.5 L45 103 L48.5 103 Z" fill="#F59E0B" />
        </g>
        
        {/* Heart */}
        <path d="M100 20 C95 15, 85 15, 85 25 C85 35, 100 45, 100 45 C100 45, 115 35, 115 25 C115 15, 105 15, 100 20" fill="#EF4444" className="animate-pulse" />
      </svg>
    </IllustrationWrapper>
  );
}

// Add Properties illustration - Browser with extension
export function AddPropertiesIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper className={className}>
      <svg viewBox="0 0 200 160" className="w-48 h-40" fill="none">
        {/* Background */}
        <circle cx="100" cy="80" r="70" fill="#F0FDF4" />
        
        {/* Browser window */}
        <rect x="30" y="35" width="140" height="100" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="2" />
        
        {/* Browser header */}
        <rect x="30" y="35" width="140" height="24" rx="8" fill="#F3F4F6" />
        <rect x="30" y="51" width="140" height="8" fill="#F3F4F6" />
        
        {/* Browser buttons */}
        <circle cx="44" cy="47" r="5" fill="#EF4444" />
        <circle cx="58" cy="47" r="5" fill="#FCD34D" />
        <circle cx="72" cy="47" r="5" fill="#22C55E" />
        
        {/* URL bar */}
        <rect x="86" y="42" width="76" height="10" rx="5" fill="white" />
        
        {/* Property listing mockup */}
        <rect x="40" y="68" width="45" height="30" rx="4" fill="#DBEAFE" />
        <rect x="40" y="102" width="35" height="6" rx="2" fill="#93C5FD" />
        <rect x="40" y="112" width="25" height="6" rx="2" fill="#BFDBFE" />
        
        <rect x="95" y="68" width="45" height="30" rx="4" fill="#DBEAFE" />
        <rect x="95" y="102" width="35" height="6" rx="2" fill="#93C5FD" />
        <rect x="95" y="112" width="25" height="6" rx="2" fill="#BFDBFE" />
        
        {/* Extension popup */}
        <g className="animate-bounce" style={{ animationDuration: '2s' }}>
          <rect x="130" y="15" width="60" height="50" rx="8" fill="white" stroke="#22C55E" strokeWidth="3" />
          <rect x="140" y="25" width="40" height="6" rx="2" fill="#22C55E" opacity="0.3" />
          <rect x="140" y="35" width="30" height="6" rx="2" fill="#22C55E" opacity="0.3" />
          
          {/* Plus button */}
          <circle cx="160" cy="52" r="8" fill="#22C55E" />
          <path d="M156 52 H164 M160 48 V56" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </g>
        
        {/* Arrow pointing to extension */}
        <path d="M115 40 Q125 25, 128 30" stroke="#22C55E" strokeWidth="2" strokeDasharray="4 2" fill="none" markerEnd="url(#arrow)" />
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="#22C55E" />
          </marker>
        </defs>
      </svg>
    </IllustrationWrapper>
  );
}

// Organize illustration - Cards with stars and tags
export function OrganizeIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper className={className}>
      <svg viewBox="0 0 200 160" className="w-48 h-40" fill="none">
        {/* Background */}
        <circle cx="100" cy="80" r="70" fill="#FEF3C7" />
        
        {/* Card 1 - Back */}
        <rect x="25" y="40" width="100" height="80" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="2" transform="rotate(-8 75 80)" />
        
        {/* Card 2 - Middle */}
        <rect x="40" y="35" width="100" height="80" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="2" transform="rotate(-3 90 75)" />
        
        {/* Card 3 - Front */}
        <rect x="55" y="45" width="100" height="80" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="2" />
        
        {/* Property image placeholder */}
        <rect x="62" y="52" width="30" height="30" rx="4" fill="#DBEAFE" />
        <circle cx="77" cy="62" r="6" fill="#93C5FD" />
        <path d="M62 77 L72 70 L82 75 L92 65" stroke="#3B82F6" strokeWidth="2" fill="none" />
        
        {/* Property text */}
        <rect x="98" y="55" width="50" height="6" rx="2" fill="#374151" />
        <rect x="98" y="65" width="35" height="4" rx="1" fill="#9CA3AF" />
        
        {/* Stars */}
        <g className="animate-pulse">
          <path d="M98 78 L100 82 L105 82 L101 85 L103 90 L98 87 L93 90 L95 85 L91 82 L96 82 Z" fill="#FCD34D" />
          <path d="M110 78 L112 82 L117 82 L113 85 L115 90 L110 87 L105 90 L107 85 L103 82 L108 82 Z" fill="#FCD34D" />
          <path d="M122 78 L124 82 L129 82 L125 85 L127 90 L122 87 L117 90 L119 85 L115 82 L120 82 Z" fill="#FCD34D" />
          <path d="M134 78 L136 82 L141 82 L137 85 L139 90 L134 87 L129 90 L131 85 L127 82 L132 82 Z" fill="#D1D5DB" />
          <path d="M146 78 L148 82 L153 82 L149 85 L151 90 L146 87 L141 90 L143 85 L139 82 L144 82 Z" fill="#D1D5DB" />
        </g>
        
        {/* Tags */}
        <rect x="62" y="98" width="35" height="16" rx="8" fill="#DCFCE7" />
        <text x="79.5" y="110" textAnchor="middle" fontSize="8" fill="#16A34A" fontWeight="600">Favorite</text>
        
        <rect x="102" y="98" width="45" height="16" rx="8" fill="#FEE2E2" />
        <text x="124.5" y="110" textAnchor="middle" fontSize="8" fill="#DC2626" fontWeight="600">To Visit</text>
        
        {/* Sparkle */}
        <path d="M160 35 L163 42 L170 42 L165 47 L167 55 L160 50 L153 55 L155 47 L150 42 L157 42 Z" fill="#F59E0B" className="animate-spin" style={{ animationDuration: '4s', transformOrigin: '160px 45px' }} />
      </svg>
    </IllustrationWrapper>
  );
}

// Map View illustration
export function MapViewIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper className={className}>
      <svg viewBox="0 0 200 160" className="w-48 h-40" fill="none">
        {/* Background */}
        <circle cx="100" cy="80" r="70" fill="#ECFDF5" />
        
        {/* Map background */}
        <rect x="30" y="30" width="140" height="100" rx="8" fill="#E0F2FE" />
        
        {/* Roads */}
        <path d="M30 70 H170" stroke="#FEF3C7" strokeWidth="8" />
        <path d="M100 30 V130" stroke="#FEF3C7" strokeWidth="6" />
        <path d="M60 50 L140 110" stroke="#FEF3C7" strokeWidth="4" />
        
        {/* Map markers */}
        <g>
          {/* Marker 1 */}
          <ellipse cx="60" cy="58" rx="8" ry="4" fill="rgba(0,0,0,0.2)" />
          <path d="M60 55 C60 45, 50 40, 50 50 C50 55, 60 65, 60 65 C60 65, 70 55, 70 50 C70 40, 60 45, 60 55" fill="#EF4444" />
          <circle cx="60" cy="50" r="4" fill="white" />
        </g>
        
        <g>
          {/* Marker 2 */}
          <ellipse cx="130" cy="88" rx="8" ry="4" fill="rgba(0,0,0,0.2)" />
          <path d="M130 85 C130 75, 120 70, 120 80 C120 85, 130 95, 130 95 C130 95, 140 85, 140 80 C140 70, 130 75, 130 85" fill="#3B82F6" />
          <circle cx="130" cy="80" r="4" fill="white" />
        </g>
        
        <g>
          {/* Marker 3 - Your location */}
          <ellipse cx="100" cy="73" rx="10" ry="5" fill="rgba(0,0,0,0.15)" />
          <circle cx="100" cy="68" r="12" fill="#22C55E" stroke="white" strokeWidth="3" />
          <circle cx="100" cy="68" r="5" fill="white" />
        </g>
        
        {/* Distance lines */}
        <line x1="100" y1="68" x2="60" y2="50" stroke="#22C55E" strokeWidth="2" strokeDasharray="4 4" />
        <line x1="100" y1="68" x2="130" y2="80" stroke="#22C55E" strokeWidth="2" strokeDasharray="4 4" />
        
        {/* Distance badge */}
        <rect x="70" y="50" width="28" height="16" rx="8" fill="white" stroke="#22C55E" strokeWidth="1" />
        <text x="84" y="62" textAnchor="middle" fontSize="8" fill="#16A34A" fontWeight="bold">1.2km</text>
        
        {/* Legend */}
        <rect x="35" y="110" width="60" height="16" rx="4" fill="white" opacity="0.9" />
        <circle cx="44" cy="118" r="4" fill="#22C55E" />
        <text x="52" y="121" fontSize="7" fill="#374151">Your Center</text>
      </svg>
    </IllustrationWrapper>
  );
}

// Share illustration - Link and people
export function ShareIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper className={className}>
      <svg viewBox="0 0 200 160" className="w-48 h-40" fill="none">
        {/* Background */}
        <circle cx="100" cy="80" r="70" fill="#EDE9FE" />
        
        {/* Central link icon */}
        <g transform="translate(70, 55)">
          <rect x="0" y="10" width="60" height="30" rx="6" fill="white" stroke="#8B5CF6" strokeWidth="2" />
          <path d="M15 25 L25 25 M35 25 L45 25" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
          <circle cx="30" cy="25" r="6" fill="#8B5CF6" />
          <path d="M27 22 L30 25 L33 22 M27 28 L30 25 L33 28" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        
        {/* Copy animation effect */}
        <g className="animate-pulse">
          <rect x="135" y="55" width="40" height="20" rx="6" fill="#22C55E" />
          <path d="M145 65 L150 70 L160 60" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        
        {/* People icons */}
        <g>
          {/* Person 1 - left */}
          <circle cx="40" cy="40" r="12" fill="#FBBF24" />
          <circle cx="40" cy="36" r="5" fill="white" />
          <path d="M32 48 Q40 55, 48 48" fill="white" />
          
          {/* Person 2 - right */}
          <circle cx="160" cy="40" r="12" fill="#F472B6" />
          <circle cx="160" cy="36" r="5" fill="white" />
          <path d="M152 48 Q160 55, 168 48" fill="white" />
          
          {/* Person 3 - bottom */}
          <circle cx="100" cy="130" r="12" fill="#60A5FA" />
          <circle cx="100" cy="126" r="5" fill="white" />
          <path d="M92 138 Q100 145, 108 138" fill="white" />
        </g>
        
        {/* Connection lines */}
        <path d="M52 45 Q70 35, 90 60" stroke="#C4B5FD" strokeWidth="2" strokeDasharray="4 4" />
        <path d="M148 45 Q130 35, 110 60" stroke="#C4B5FD" strokeWidth="2" strokeDasharray="4 4" />
        <path d="M100 95 V115" stroke="#C4B5FD" strokeWidth="2" strokeDasharray="4 4" />
        
        {/* Sparkles */}
        <path d="M75 35 L77 38 L80 38 L78 40 L79 43 L75 41 L71 43 L72 40 L70 38 L73 38 Z" fill="#FBBF24" className="animate-pulse" />
        <path d="M125 35 L127 38 L130 38 L128 40 L129 43 L125 41 L121 43 L122 40 L120 38 L123 38 Z" fill="#F472B6" className="animate-pulse" />
      </svg>
    </IllustrationWrapper>
  );
}

// Completion celebration illustration
export function CompletionIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper className={className}>
      <svg viewBox="0 0 200 160" className="w-56 h-44" fill="none">
        {/* Confetti background */}
        <circle cx="100" cy="80" r="70" fill="#FEF3C7" />
        
        {/* Confetti pieces */}
        <rect x="40" y="30" width="8" height="8" rx="1" fill="#EF4444" transform="rotate(15 44 34)" className="animate-bounce" style={{ animationDelay: '0s', animationDuration: '1s' }} />
        <rect x="60" y="20" width="6" height="6" rx="1" fill="#3B82F6" transform="rotate(-20 63 23)" className="animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '1.2s' }} />
        <rect x="130" y="25" width="7" height="7" rx="1" fill="#22C55E" transform="rotate(30 133 28)" className="animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1.1s' }} />
        <rect x="155" y="40" width="8" height="8" rx="1" fill="#F59E0B" transform="rotate(-10 159 44)" className="animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '0.9s' }} />
        <rect x="35" y="60" width="6" height="6" rx="1" fill="#8B5CF6" transform="rotate(25 38 63)" className="animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1.3s' }} />
        <rect x="160" y="70" width="7" height="7" rx="1" fill="#EC4899" transform="rotate(-15 163 73)" className="animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '1s' }} />
        
        {/* Trophy */}
        <g transform="translate(70, 40)">
          {/* Trophy cup */}
          <path d="M15 10 L45 10 L42 50 L18 50 Z" fill="#FCD34D" />
          <path d="M10 10 Q5 10, 5 20 Q5 35, 15 35 L15 10" fill="#FCD34D" />
          <path d="M50 10 Q55 10, 55 20 Q55 35, 45 35 L45 10" fill="#FCD34D" />
          <ellipse cx="30" cy="10" rx="15" ry="4" fill="#F59E0B" />
          
          {/* Trophy stem */}
          <rect x="24" y="50" width="12" height="15" fill="#FCD34D" />
          
          {/* Trophy base */}
          <rect x="18" y="65" width="24" height="8" rx="2" fill="#F59E0B" />
          <rect x="15" y="73" width="30" height="6" rx="2" fill="#D97706" />
          
          {/* Star on trophy */}
          <path d="M30 20 L33 28 L41 28 L35 33 L37 41 L30 36 L23 41 L25 33 L19 28 L27 28 Z" fill="white" />
        </g>
        
        {/* Sparkle bursts */}
        <g className="animate-pulse">
          <path d="M50 85 L55 90 L60 85 L55 95 Z" fill="#FCD34D" />
          <path d="M145 90 L150 95 L155 90 L150 100 Z" fill="#FCD34D" />
        </g>
        
        {/* Celebration text bubble */}
        <rect x="45" y="120" width="110" height="28" rx="14" fill="white" stroke="#22C55E" strokeWidth="2" />
        <text x="100" y="138" textAnchor="middle" fontSize="11" fill="#16A34A" fontWeight="bold">You're all set! 🎉</text>
      </svg>
    </IllustrationWrapper>
  );
}
