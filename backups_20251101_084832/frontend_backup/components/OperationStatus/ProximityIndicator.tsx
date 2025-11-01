import React, { useState, useEffect } from 'react';
import { Navigation, AlertCircle, CheckCircle } from 'lucide-react';
import { VesselInfo } from './VesselCard';

interface ProximityIndicatorProps {
  motherVessel: VesselInfo;
  receivingVessel: VesselInfo;
  updateInterval?: number; // milliseconds
}

interface ProximityData {
  distanceNm: number;
  closingSpeedKts: number;
  eta: number | null; // minutes
  status: 'safe' | 'warning' | 'critical';
}

interface TimelineStage {
  label: string;
  distance: number;
  eta: number | null;
  status: 'completed' | 'current' | 'upcoming';
}

/**
 * ProximityIndicator Component
 * Calculates and displays distance between two vessels
 * Estimates time to critical proximity milestones
 * 
 * Calculations:
 * - Haversine formula for distance
 * - Closing speed = receiving speed - mother speed
 * - ETA = current distance / closing speed
 */
export const ProximityIndicator: React.FC<ProximityIndicatorProps> = ({
  motherVessel,
  receivingVessel,
  updateInterval = 30000 // 30 seconds default
}) => {
  const [proximityData, setProximityData] = useState<ProximityData>({
    distanceNm: 0,
    closingSpeedKts: 0,
    eta: null,
    status: 'safe'
  });

  const [timeline, setTimeline] = useState<TimelineStage[]>([
    { label: 'Current Position', distance: 0, eta: 0, status: 'current' },
    { label: '500m Proximity', distance: 0.27, eta: null, status: 'upcoming' }, // ~500m in nm
    { label: 'Alongside', distance: 0.05, eta: null, status: 'upcoming' }
  ]);

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in nautical miles
   */
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 3440.065; // Radius of Earth in nautical miles

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Determine proximity status based on distance
   */
  const getProximityStatus = (distance: number): ProximityData['status'] => {
    if (distance < 0.1) return 'critical'; // < 200m
    if (distance < 0.5) return 'warning';  // < 1000m
    return 'safe';
  };

  /**
   * Update proximity calculations
   */
  const updateProximity = () => {
    try {
      // Calculate distance between vessels
      const distanceNm = calculateDistance(
        motherVessel.latitude,
        motherVessel.longitude,
        receivingVessel.latitude,
        receivingVessel.longitude
      );

      // Calculate closing speed (positive = approaching)
      const closingSpeedKts = receivingVessel.speed - motherVessel.speed;

      // Calculate ETA to alongside (if approaching)
      let eta: number | null = null;
      if (closingSpeedKts > 0.1) {
        eta = (distanceNm / closingSpeedKts) * 60; // Convert hours to minutes
      }

      const status = getProximityStatus(distanceNm);

      setProximityData({
        distanceNm,
        closingSpeedKts,
        eta,
        status
      });

      // Update timeline stages
      setTimeline(prev =>
        prev.map(stage => {
          let newStatus = stage.status;
          let etaValue = eta;

          if (distanceNm < stage.distance) {
            newStatus = 'completed';
          } else if (
            distanceNm >= stage.distance &&
            prev.some(s => s.status === 'completed')
          ) {
            newStatus = 'current';
            if (eta !== null) {
              etaValue = Math.max(0, eta - ((0.27 - stage.distance) / closingSpeedKts) * 60);
            }
          }

          return {
            ...stage,
            eta: etaValue ? Math.round(etaValue) : null,
            status: newStatus
          };
        })
      );
    } catch (error) {
      console.error('Proximity calculation error:', error);
    }
  };

  // Update on mount and at intervals
  useEffect(() => {
    updateProximity();
    const interval = setInterval(updateProximity, updateInterval);
    return () => clearInterval(interval);
  }, [motherVessel, receivingVessel, updateInterval]);

  // Status colors and icons
  const statusConfig = {
    safe: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle,
      message: '✓ Safe distance maintained'
    },
    warning: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: AlertCircle,
      message: '⚠ Vessels approaching - monitor closely'
    },
    critical: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: AlertCircle,
      message: '⚠ CRITICAL - Vessels in close proximity'
    }
  };

  const currentConfig = statusConfig[proximityData.status];
  const StatusIcon = currentConfig.icon;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Navigation className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Navigation & Proximity
        </h3>
      </div>

      {/* Main Distance Display */}
      <div className="text-center mb-8 py-6 bg-gradient-to-b from-blue-50 to-transparent rounded-lg">
        <div className="text-6xl font-bold text-blue-600 mb-3">
          {proximityData.distanceNm.toFixed(2)}
        </div>
        <div className="text-gray-600 font-medium">
          Nautical Miles Between Vessels
        </div>

        {proximityData.closingSpeedKts > 0 && (
          <div className="text-blue-600 font-semibold mt-3">
            ↓ Closing at {proximityData.closingSpeedKts.toFixed(1)} kts
          </div>
        )}
      </div>

      {/* Status Alert */}
      <div className={`${currentConfig.bgColor} border ${currentConfig.borderColor} rounded-lg p-4 mb-6 flex items-center gap-3`}>
        <StatusIcon className={`w-5 h-5 ${currentConfig.color} flex-shrink-0`} />
        <div className={`text-sm font-semibold ${currentConfig.color}`}>
          {currentConfig.message}
        </div>
      </div>

      {/* Approach Timeline */}
      <div className="space-y-3 mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">
          Approach Timeline
        </h4>

        {timeline.map((stage, index) => {
          const isActive = stage.status === 'current';
          const isCompleted = stage.status === 'completed';

          return (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? 'bg-blue-50 border-blue-400 shadow-md'
                  : isCompleted
                  ? 'bg-green-50 border-green-300'
                  : 'bg-gray-50 border-gray-300'
              }`}
            >
              {/* Status Indicator */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isCompleted
                      ? 'bg-green-500'
                      : isActive
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-gray-400'
                  }`}
                />
                <span
                  className={`font-semibold ${
                    isCompleted
                      ? 'text-green-700'
                      : isActive
                      ? 'text-blue-700'
                      : 'text-gray-700'
                  }`}
                >
                  {stage.label}
                </span>
              </div>

              {/* ETA */}
              <span
                className={`font-bold ${
                  isCompleted
                    ? 'text-green-600'
                    : isActive
                    ? 'text-blue-600'
                    : 'text-gray-600'
                }`}
              >
                {stage.status === 'completed'
                  ? '✓'
                  : stage.eta !== null
                  ? `~${stage.eta} min`
                  : '-'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Vessel Status
          </div>
          <div className="text-sm font-semibold text-gray-800">
            {motherVessel.status === 'at_anchor'
              ? '⚓ At Anchor'
              : '→ Underway'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Receiving Status
          </div>
          <div className="text-sm font-semibold text-gray-800">
            {receivingVessel.status === 'approaching'
              ? '→ Approaching'
              : '⚓ Mooring'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProximityIndicator;