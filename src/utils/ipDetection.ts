// Utility for detecting client IP address with multiple fallback methods

export const getClientIP = async (): Promise<string> => {
  try {
    // Method 1: Try multiple public IP services for redundancy
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://api.myip.com',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip'
    ];

    for (const service of ipServices) {
      try {
        const response = await fetch(service, { 
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache'
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Handle different response formats
          if (data.ip) {
            return data.ip;
          } else if (data.origin) {
            return data.origin;
          } else if (data.query) {
            return data.query;
          }
        }
      } catch (error) {
        console.warn(`IP service ${service} failed:`, error);
        continue; // Try next service
      }
    }

    // Method 2: Try to get from request headers (if available in server context)
    // This would work in edge functions or server-side contexts
    
    // Method 3: Default fallback
    console.warn('All IP detection methods failed, using fallback');
    return '127.0.0.1';
    
  } catch (error) {
    console.error('Error in IP detection:', error);
    return '127.0.0.1';
  }
};

// Alternative method using a single reliable service
export const getClientIPSimple = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.ip;
    }
  } catch (error) {
    console.warn('Simple IP detection failed:', error);
  }
  
  return '127.0.0.1';
};
