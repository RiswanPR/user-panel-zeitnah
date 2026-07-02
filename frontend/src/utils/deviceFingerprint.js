// Generates or retrieves a persistent device ID for the session manager
export const getPersistentDeviceId = async () => {
  let deviceId = localStorage.getItem("device_id");
  
  if (!deviceId) {
    // Basic fingerprinting
    const userAgent = navigator.userAgent;
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    
    // Hash the basic fingerprint components
    const str = `${userAgent}-${screenRes}-${timezone}-${language}-${Math.random().toString(36).substring(2)}`;
    
    // Use Web Crypto API for SHA-256 hash
    const msgBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    deviceId = `dev_${hashHex.substring(0, 16)}`;
    localStorage.setItem("device_id", deviceId);
  }
  
  return deviceId;
};

// Gets browser fingerprint data for backend tracking
export const getBrowserFingerprint = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
};
