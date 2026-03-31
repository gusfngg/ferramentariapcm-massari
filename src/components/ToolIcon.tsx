import { ToolCategory } from '@/lib/types';

interface ToolIconProps {
  category: ToolCategory;
  size?: number;
  className?: string;
  color?: string;
}

export default function ToolIcon({ category, size = 80, className = '', color = '#0A0A0A' }: ToolIconProps) {
  const icons: Record<ToolCategory, React.ReactNode> = {
    hand: (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Wrench */}
        <path
          d="M70 15C61.7 15 55 21.7 55 30C55 32.5 55.7 34.8 56.9 36.8L20 73.7C18.7 75 18 76.8 18 78.7C18 82.7 21.3 86 25.3 86C27.2 86 29 85.3 30.3 84L67.2 47.1C69.2 48.3 71.5 49 74 49C82.3 49 89 42.3 89 34C89 31.5 88.3 29.2 87.1 27.2L78 36.3L63.7 30.3L57.7 16L66.8 6.9C64.8 5.7 62.5 5 60 5"
          fill={color}
          opacity="0.15"
        />
        <path
          d="M72 12C62.1 12 54 20.1 54 30C54 33.2 54.9 36.2 56.4 38.8L18.8 76.4C17.6 77.6 17 79.2 17 80.9C17 84.4 19.9 87.3 23.4 87.3C25.1 87.3 26.7 86.7 27.9 85.5L65.5 47.9C68.1 49.4 71.1 50.3 74.3 50.3C84.2 50.3 92.3 42.2 92.3 32.3"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="23" cy="81" r="5" fill={color} />
        <path
          d="M72 12L62 22L68 38L84 32L92 22C89.5 16.2 81.3 12 72 12Z"
          fill={color}
          opacity="0.8"
        />
      </svg>
    ),

    power: (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Drill */}
        <rect x="30" y="35" width="45" height="22" rx="4" fill={color} opacity="0.15" stroke={color} strokeWidth="3" />
        <rect x="70" y="40" width="15" height="12" rx="2" fill={color} opacity="0.5" />
        <rect x="85" y="43" width="8" height="6" rx="1" fill={color} />
        <rect x="30" y="38" width="20" height="16" rx="3" fill={color} opacity="0.3" />
        <path d="M38 57 L28 75 L50 75 L50 57" fill={color} opacity="0.6" />
        <rect x="38" y="55" width="14" height="5" rx="1" fill={color} opacity="0.8" />
        <circle cx="33" cy="46" r="5" fill={color} opacity="0.4" stroke={color} strokeWidth="2" />
        <path d="M55 35 L55 57" stroke={color} strokeWidth="2" strokeDasharray="3 2" />
      </svg>
    ),

    measuring: (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Caliper/Ruler */}
        <rect x="10" y="40" width="80" height="18" rx="3" fill={color} opacity="0.15" stroke={color} strokeWidth="3" />
        <line x1="20" y1="40" x2="20" y2="33" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="30" y1="40" x2="30" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="40" y1="40" x2="40" y2="33" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="40" x2="50" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="40" x2="60" y2="33" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="70" y1="40" x2="70" y2="36" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="80" y1="40" x2="80" y2="33" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="38" y="50" width="24" height="8" rx="1" fill={color} opacity="0.5" />
        <text x="50" y="57" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold" fontFamily="monospace">0.00</text>
        <path d="M10 42 L10 56" stroke={color} strokeWidth="4" strokeLinecap="round" />
        <path d="M10 42 L16 42 L16 36" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 56 L16 56 L16 62" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),

    electrical: (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Multimeter */}
        <rect x="25" y="20" width="50" height="65" rx="6" fill={color} opacity="0.1" stroke={color} strokeWidth="3" />
        <rect x="32" y="28" width="36" height="22" rx="3" fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
        <text x="50" y="44" textAnchor="middle" fontSize="11" fill={color} fontWeight="bold" fontFamily="monospace">220V</text>
        <circle cx="38" cy="63" r="6" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
        <circle cx="62" cy="63" r="6" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
        <line x1="50" y1="55" x2="50" y2="75" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="45" y1="65" x2="55" y2="65" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M38 75 L38 90" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
        <path d="M62 75 L62 90" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" />
        <circle cx="38" cy="91" r="3" fill="#DC2626" />
        <circle cx="62" cy="91" r="3" fill="#0A0A0A" />
      </svg>
    ),

    cutting: (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        {/* Pliers */}
        <path
          d="M20 20 L45 50 L35 65 L10 35 Z"
          fill={color}
          opacity="0.2"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M80 20 L55 50 L65 65 L90 35 Z"
          fill={color}
          opacity="0.2"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <ellipse cx="50" cy="52" rx="10" ry="6" fill={color} opacity="0.5" />
        <path d="M35 65 L45 90" stroke={color} strokeWidth="7" strokeLinecap="round" />
        <path d="M65 65 L55 90" stroke={color} strokeWidth="7" strokeLinecap="round" />
        <path d="M35 65 L65 65" stroke={color} strokeWidth="4" strokeLinecap="round" />
        {/* Bolt */}
        <circle cx="50" cy="52" r="5" fill={color} />
        <circle cx="50" cy="52" r="2.5" fill="white" />
      </svg>
    ),
  };

  return <>{icons[category]}</>;
}

export function ToolIconSmall({ category, className = '' }: { category: ToolCategory; className?: string }) {
  return <ToolIcon category={category} size={32} className={className} color="#DC2626" />;
}
