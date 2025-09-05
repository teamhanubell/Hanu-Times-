class CacheManager {
  constructor(database) {
    this.db = database;
    this.memoryCache = new Map(); // In-memory cache for ultra-fast access
    this.maxMemoryItems = 1000;
    
    // Clean up expired cache every hour
    setInterval(() => this.cleanup(), 3600000);
  }

  async get(key) {
    try {
      // Check memory cache first
      if (this.memoryCache.has(key)) {
        const item = this.memoryCache.get(key);
        if (!item.expiresAt || item.expiresAt > Date.now()) {
          return item.value;
        } else {
          this.memoryCache.delete(key);
        }
      }

      // Check database cache
      const cached = await this.db.getCache(key);
      if (cached) {
        // Store in memory cache for next time
        this.setMemoryCache(key, cached);
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttlSeconds = null) {
    try {
      // Store in database
      await this.db.setCache(key, value, ttlSeconds);
      
      // Store in memory cache
      this.setMemoryCache(key, value, ttlSeconds);
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  setMemoryCache(key, value, ttlSeconds = null) {
    // Prevent memory cache from growing too large
    if (this.memoryCache.size >= this.maxMemoryItems) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
    this.memoryCache.set(key, { value, expiresAt });
  }

  async invalidate(key) {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);
      
      // Remove from database cache
      await this.db.deleteCache(key);
      
      return true;
    } catch (error) {
      console.error('Cache invalidate error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    try {
      // Clear memory cache items matching pattern
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      }

      // For database, we need to get all keys and filter
      // This is not efficient for large datasets, but works for our use case
      const allCacheKeys = await this.db.all('SELECT key FROM cache');
      for (const row of allCacheKeys) {
        if (row.key.includes(pattern)) {
          await this.db.deleteCache(row.key);
        }
      }

      return true;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return false;
    }
  }

  async cleanup() {
    try {
      // Clean expired items from memory cache
      for (const [key, item] of this.memoryCache.entries()) {
        if (item.expiresAt && item.expiresAt <= Date.now()) {
          this.memoryCache.delete(key);
        }
      }

      // Clean expired items from database cache
      await this.db.clearExpiredCache();
      
      console.log('Cache cleanup completed');
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  // Preload commonly used data
  async preloadUserData(userId) {
    try {
      const courses = await this.db.getCoursesByUser(userId);
      await this.set(`courses_${userId}`, courses, 1800); // 30 minutes

      const sessions = await this.db.getSessionsByUser(userId);
      await this.set(`sessions_${userId}`, sessions, 1800);

      const constraints = await this.db.getConstraintsByUser(userId);
      await this.set(`constraints_${userId}`, constraints, 1800);

      console.log(`Preloaded cache for user ${userId}`);
    } catch (error) {
      console.error('Cache preload error:', error);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      memoryItems: this.memoryCache.size,
      maxMemoryItems: this.maxMemoryItems
    };
  }

  // Clear all cache
  async clear() {
    try {
      this.memoryCache.clear();
      await this.db.run('DELETE FROM cache');
      console.log('All cache cleared');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

module.exports = CacheManager;
