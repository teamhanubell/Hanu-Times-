// Simple in-memory cache for timetable data
class TimetableCache {
  constructor() {
    this.cache = {};
    this.ttl = 5 * 60 * 1000; // 5 minutes TTL
  }

  // Get cached timetable data
  getTimetable(key = 'all') {
    const cached = this.cache[key];
    
    if (!cached) {
      return null;
    }
    
    // Check if cache has expired
    if (Date.now() > cached.expires) {
      delete this.cache[key];
      return null;
    }
    
    return cached.data;
  }

  // Set timetable data in cache
  setTimetable(data, key = 'all') {
    this.cache[key] = {
      data: data,
      expires: Date.now() + this.ttl,
      timestamp: Date.now()
    };
  }

  // Invalidate cache
  invalidate(key = null) {
    if (key) {
      delete this.cache[key];
    } else {
      // Clear all cache
      this.cache = {};
    }
  }

  // Get cache stats (for debugging)
  getStats() {
    const keys = Object.keys(this.cache);
    const stats = {
      totalKeys: keys.length,
      keys: keys.map(key => ({
        key,
        timestamp: this.cache[key].timestamp,
        expires: this.cache[key].expires,
        expired: Date.now() > this.cache[key].expires
      }))
    };
    
    return stats;
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now();
    const keys = Object.keys(this.cache);
    
    keys.forEach(key => {
      if (now > this.cache[key].expires) {
        delete this.cache[key];
      }
    });
  }
}

// Create singleton instance
const cache = new TimetableCache();

// Auto cleanup every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);

module.exports = cache;