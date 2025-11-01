import React from 'react';
import { Ship, Navigation, Compass, Anchor } from 'lucide-react';

export interface VesselInfo {
  id: string;
  name: string;
  imo: string;
  type: string;
  status: 'at_anchor' | 'approaching' | 'alongside' | 'departed' | 'unknown';
  latitude: number;
  longitude: number;
  speed: number; // knots
  heading: number; // degrees (0-360)
  lastUpdated?: Date;
}

interface VesselCardProps {
  vessel: VesselInfo;
  index?: number;
}

/**
 * VesselCard Component
 * Displays AIS tracking information for a single vessel
 * 
 * Shows:
 * - Vessel name and status
 * - Position (latitude/longitude)
 * - Speed in knots
 * - Heading in degrees
 * - IMO number
 */
export const VesselCard: React.FC<VesselCardProps> = ({ vessel, index = 0 }) => {
  // Determine gradient color based on index (alternating colors)
  const gradients = [
    'from-pink-500 to-red-500',     // Mother vessel
    'from-blue-500 to-cyan-500',    // Receiving vessel
    'from-purple-500 to-pink-500',  // Additional vessels
  ];

  const gradient = gradients[index % gradients.length];

  // Map status to display text and icons
  const statusDisplay: Record<VesselInfo['status'], {text: string; icon: string; color: string}> = {
    at_anchor: { text: '● At Anchor', icon: '⚓', color: 'bg-blue-200' },
    approaching: { text: '● Approaching', icon: '→', color: 'bg-yellow-200' },
    alongside: { text: '● Alongside', icon: '⇄', color: 'bg-green-200' },
    departed: { text: '● Departed', icon: '→', color: 'bg-gray-200' },
    unknown: { text: '● Unknown', icon: '?', color: 'bg-gray-200' }
  };

  const currentStatus = statusDisplay[vessel.status];

  // Format coordinates to nautical format (degrees, minutes)
  const formatCoordinate = (value: number, isLat: boolean): string => {
    const direction = isLat 
      ? (value >= 0 ? 'N' : 'S') 
      : (value >= 0 ? 'E' : 'W');
    
    const absValue = Math.abs(value);
    const degrees = Math.floor(absValue);
    const minutes = (absValue - degrees) * 60;
    
    return `${degrees}°${minutes.toFixed(1)}'${direction}`;
  };

  return (
    <div className={`bg-gradient-to-r ${gradient} text-white p-6 rounded-lg shadow-lg overflow-hidden`}>
      {/* Header with vessel name and status */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Ship className="w-6 h-6" />
          <h3 className="text-xl font-bold">{vessel.name}</h3>
        </div>
        <div className={`${currentStatus.color} text-gray-800 px-3 py-1 rounded-full text-sm font-semibold`}>
          {currentStatus.icon} {currentStatus.text}
        </div>
      </div>

      {/* Vessel Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Position */}
        <div className="bg-white bg-opacity-15 backdrop-blur-sm p-3 rounded-lg border border-white border-opacity-20">
          <div className="text-xs opacity-80 uppercase tracking-wider mb-1">Position</div>
          <div className="font-bold text-sm">
            <div>{formatCoordinate(vessel.latitude, true)}</div>
            <div>{formatCoordinate(vessel.longitude, false)}</div>
          </div>
        </div>

        {/* Speed */}
        <div className="bg-white bg-opacity-15 backdrop-blur-sm p-3 rounded-lg border border-white border-opacity-20">
          <div className="text-xs opacity-80 uppercase tracking-wider mb-1">Speed</div>
          <div className="font-bold text-lg">{vessel.speed.toFixed(1)}</div>
          <div className="text-xs opacity-80">knots</div>
        </div>

        {/* Heading */}
        <div className="bg-white bg-opacity-15 backdrop-blur-sm p-3 rounded-lg border border-white border-opacity-20">
          <div className="text-xs opacity-80 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Compass className="w-4 h-4" />
            Heading
          </div>
          <div className="font-bold text-lg">{vessel.heading}°</div>
          <div className="text-xs opacity-80">{getCompassDirection(vessel.heading)}</div>
        </div>

        {/* IMO */}
        <div className="bg-white bg-opacity-15 backdrop-blur-sm p-3 rounded-lg border border-white border-opacity-20">
          <div className="text-xs opacity-80 uppercase tracking-wider mb-1">IMO</div>
          <div className="font-bold text-sm">{vessel.imo}</div>
          <div className="text-xs opacity-80">{vessel.type}</div>
        </div>
      </div>

      {/* Operational Status Message */}
      <div className="mt-4 text-center text-sm opacity-90">
        {vessel.status === 'at_anchor' && '✓ In position - Ready for STS'}
        {vessel.status === 'approaching' && '⚠ ETA to STS position: ~30-45 minutes'}
        {vessel.status === 'alongside' && '✓ Alongside - Operations commencing'}
        {vessel.status === 'departed' && '✓ Operation completed'}
      </div>

      {/* Last Update Info */}
      {vessel.lastUpdated && (
        <div className="mt-3 text-xs opacity-75 text-right">
          Last update: {vessel.lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

/**
 * Helper function to convert heading degrees to compass direction
 */
function getCompassDirection(heading: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((heading / 22.5)) % 16;
  return directions[index];
}

export default VesselCard;