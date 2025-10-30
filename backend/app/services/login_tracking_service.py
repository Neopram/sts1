"""
Login Tracking Service - Phase 2
Tracks login attempts, location data, and device information
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import httpx
import geoip2.database
from user_agents import parse

logger = logging.getLogger(__name__)


class LoginTrackingService:
    """Track and monitor user login activity"""
    
    # Configuration
    GEOLITE_DB_PATH = "/app/GeoLite2-City.mmdb"  # MaxMind GeoLite database
    UNKNOWN_LOCATION = {
        "country": "Unknown",
        "city": "Unknown",
        "latitude": 0.0,
        "longitude": 0.0,
        "timezone": "UTC"
    }
    
    def __init__(self):
        self.geoip_reader = None
        self._init_geoip()
    
    def _init_geoip(self):
        """Initialize GeoIP database"""
        try:
            self.geoip_reader = geoip2.database.Reader(self.GEOLITE_DB_PATH)
            logger.info("GeoIP database loaded successfully")
        except Exception as e:
            logger.warning(f"GeoIP database not available: {str(e)}")
            self.geoip_reader = None
    
    def get_location_from_ip(self, ip_address: str) -> Dict:
        """
        Get geographic location from IP address
        
        Args:
            ip_address: Client IP address
            
        Returns:
            Dictionary with location information
        """
        try:
            if not self.geoip_reader:
                return self.UNKNOWN_LOCATION
            
            # Skip private IPs
            if self._is_private_ip(ip_address):
                return self.UNKNOWN_LOCATION
            
            response = self.geoip_reader.city(ip_address)
            
            return {
                "country": response.country.name or "Unknown",
                "country_code": response.country.iso_code or "XX",
                "city": response.city.name or "Unknown",
                "latitude": response.location.latitude or 0.0,
                "longitude": response.location.longitude or 0.0,
                "timezone": response.location.time_zone or "UTC"
            }
        except Exception as e:
            logger.warning(f"Error getting GeoIP data: {str(e)}")
            return self.UNKNOWN_LOCATION
    
    def parse_user_agent(self, user_agent: str) -> Dict:
        """
        Parse user agent string to get device and browser info
        
        Args:
            user_agent: User agent string from HTTP header
            
        Returns:
            Dictionary with device and browser information
        """
        try:
            ua = parse(user_agent)
            
            return {
                "browser": {
                    "name": ua.browser.family or "Unknown",
                    "version": ua.browser.version_string or "Unknown"
                },
                "operating_system": {
                    "name": ua.os.family or "Unknown",
                    "version": ua.os.version_string or "Unknown"
                },
                "device": {
                    "type": ua.device.family or "Unknown",
                    "brand": ua.device.brand or "Unknown",
                    "model": ua.device.model or "Unknown"
                },
                "is_mobile": ua.is_mobile,
                "is_tablet": ua.is_tablet,
                "is_pc": ua.is_pc,
                "is_bot": ua.is_bot
            }
        except Exception as e:
            logger.warning(f"Error parsing user agent: {str(e)}")
            return {
                "browser": {"name": "Unknown", "version": "Unknown"},
                "operating_system": {"name": "Unknown", "version": "Unknown"},
                "device": {"type": "Unknown", "brand": "Unknown", "model": "Unknown"},
                "is_mobile": False,
                "is_tablet": False,
                "is_pc": False,
                "is_bot": False
            }
    
    def create_login_record(
        self,
        user_id: int,
        ip_address: str,
        user_agent: str,
        success: bool,
        failure_reason: Optional[str] = None
    ) -> Dict:
        """
        Create a login attempt record
        
        Args:
            user_id: User ID
            ip_address: Client IP address
            user_agent: User agent string
            success: Whether login was successful
            failure_reason: Reason for failed login (if applicable)
            
        Returns:
            Dictionary with login record information
        """
        location = self.get_location_from_ip(ip_address)
        device_info = self.parse_user_agent(user_agent)
        
        record = {
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow().isoformat(),
            "success": success,
            "failure_reason": failure_reason,
            "location": location,
            "device": device_info
        }
        
        # Check for suspicious activity
        if success:
            record["risk_level"] = self._assess_risk_level(user_id, location, device_info)
        
        return record
    
    def _assess_risk_level(self, user_id: int, location: Dict, device_info: Dict) -> str:
        """
        Assess risk level of login attempt
        
        Returns: 'low', 'medium', or 'high'
        """
        risk_score = 0
        
        # Bot detection
        if device_info["is_bot"]:
            risk_score += 40
        
        # Mobile device
        if device_info["is_mobile"]:
            risk_score += 5
        
        # Unknown location (if we can determine it)
        if location["country"] == "Unknown":
            risk_score += 10
        
        # TODO: Add more sophisticated risk assessment
        # - Compare with previous login locations
        # - Check for unusual login times
        # - Detect impossible travel
        
        if risk_score >= 40:
            return "high"
        elif risk_score >= 20:
            return "medium"
        else:
            return "low"
    
    def detect_anomalies(
        self,
        user_id: int,
        current_location: Dict,
        previous_login: Optional[Dict] = None,
        recent_logins: List[Dict] = None
    ) -> Dict:
        """
        Detect suspicious login patterns
        
        Returns:
            Dictionary with anomaly detection results
        """
        anomalies = []
        
        # Check for impossible travel
        if previous_login:
            if self._is_impossible_travel(current_location, previous_login):
                anomalies.append({
                    "type": "impossible_travel",
                    "severity": "high",
                    "message": "Login from different location in impossible time window"
                })
        
        # Check for unusual login time
        if self._is_unusual_time():
            anomalies.append({
                "type": "unusual_time",
                "severity": "low",
                "message": "Login at unusual time"
            })
        
        # Check for new device
        if recent_logins and self._is_new_device(recent_logins):
            anomalies.append({
                "type": "new_device",
                "severity": "medium",
                "message": "Login from new device"
            })
        
        return {
            "has_anomalies": len(anomalies) > 0,
            "anomalies": anomalies,
            "alert_sent": len(anomalies) > 0
        }
    
    def _is_impossible_travel(self, current: Dict, previous: Dict) -> bool:
        """
        Detect impossible travel between two locations
        
        Calculates if travel time is physically impossible
        """
        try:
            from geopy.distance import geodesic
            
            # Get coordinates
            current_coords = (current.get("latitude", 0), current.get("longitude", 0))
            previous_coords = (previous.get("location", {}).get("latitude", 0),
                             previous.get("location", {}).get("longitude", 0))
            
            # Calculate distance in km
            distance = geodesic(current_coords, previous_coords).kilometers
            
            # Get time difference in hours
            current_time = datetime.fromisoformat(current.get("timestamp", datetime.utcnow().isoformat()))
            previous_time = datetime.fromisoformat(previous.get("timestamp", ""))
            time_diff_hours = (current_time - previous_time).total_seconds() / 3600
            
            # Average speed needed: km/hour
            if time_diff_hours > 0:
                required_speed = distance / time_diff_hours
                # Assume maximum possible speed of 900 km/h (airplane speed)
                return required_speed > 900
            
            return False
        except Exception as e:
            logger.warning(f"Error checking impossible travel: {str(e)}")
            return False
    
    def _is_unusual_time(self) -> bool:
        """
        Detect if login is at unusual time
        TODO: Implement based on user's typical login patterns
        """
        # Placeholder - implement based on user preferences
        return False
    
    def _is_new_device(self, recent_logins: List[Dict]) -> bool:
        """
        Detect if login is from a new device
        """
        try:
            # Get device types from recent logins
            recent_devices = set()
            for login in recent_logins[-10:]:  # Last 10 logins
                device = login.get("device", {}).get("type", "Unknown")
                recent_devices.add(device)
            
            # TODO: Compare with current device
            return len(recent_devices) > 1
        except Exception as e:
            logger.warning(f"Error detecting new device: {str(e)}")
            return False
    
    @staticmethod
    def _is_private_ip(ip_address: str) -> bool:
        """Check if IP is private"""
        import ipaddress
        try:
            ip = ipaddress.ip_address(ip_address)
            return ip.is_private
        except ValueError:
            return False
    
    def generate_login_summary(self, logins: List[Dict]) -> Dict:
        """
        Generate summary statistics for login history
        """
        if not logins:
            return {}
        
        unique_locations = set()
        unique_devices = set()
        failed_attempts = 0
        
        for login in logins:
            if login.get("success"):
                location = f"{login.get('location', {}).get('city')}, {login.get('location', {}).get('country')}"
                unique_locations.add(location)
                device = login.get("device", {}).get("device", {}).get("type", "Unknown")
                unique_devices.add(device)
            else:
                failed_attempts += 1
        
        return {
            "total_logins": len(logins),
            "successful_logins": len([l for l in logins if l.get("success")]),
            "failed_attempts": failed_attempts,
            "unique_locations": len(unique_locations),
            "unique_devices": len(unique_devices),
            "most_recent": logins[0] if logins else None
        }


# Singleton instance
_tracking_service = None


def get_login_tracking_service() -> LoginTrackingService:
    """Get or create login tracking service instance"""
    global _tracking_service
    if _tracking_service is None:
        _tracking_service = LoginTrackingService()
    return _tracking_service