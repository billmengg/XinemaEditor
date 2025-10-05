// Global console deduplication utility
// Prevents duplicate console messages across the entire application

class ConsoleDeduplication {
  constructor() {
    this.lastMessages = new Map();
    this.messageCounts = new Map();
  }

  // Log a message only if it hasn't been logged before
  logOnce(key, message, data = null) {
    const lastMessage = this.lastMessages.get(key);
    const lastTime = this.messageCounts.get(key + '_time') || 0;
    const now = Date.now();
    
    // For messages with changing data (like frame numbers), only show once every 2 seconds
    const timeThreshold = 2000;
    
    if (lastMessage !== message || (now - lastTime) > timeThreshold) {
      this.lastMessages.set(key, message);
      this.messageCounts.set(key, 1);
      this.messageCounts.set(key + '_time', now);
      
      if (data !== null) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    } else {
      // Increment count for duplicate messages
      const count = this.messageCounts.get(key) || 0;
      this.messageCounts.set(key, count + 1);
    }
  }

  // Log a message with a count of how many times it was suppressed
  logWithCount(key, message, data = null) {
    const lastMessage = this.lastMessages.get(key);
    if (lastMessage !== message) {
      this.lastMessages.set(key, message);
      this.messageCounts.set(key, 1);
      
      if (data !== null) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    } else {
      // Increment count and show it
      const count = this.messageCounts.get(key) || 0;
      this.messageCounts.set(key, count + 1);
      
      if (count > 0 && count % 10 === 0) {
        console.log(`${message} (${count + 1} times)`);
      }
    }
  }

  // Clear all stored messages (useful for debugging)
  clear() {
    this.lastMessages.clear();
    this.messageCounts.clear();
  }

  // Get statistics about suppressed messages
  getStats() {
    const stats = {};
    for (const [key, count] of this.messageCounts) {
      if (count > 1) {
        stats[key] = count;
      }
    }
    return stats;
  }
}

// Create a global instance
const globalConsoleDedup = new ConsoleDeduplication();

// Export the global instance and utility functions
export default globalConsoleDedup;

// Convenience functions
export const logOnce = (key, message, data = null) => {
  globalConsoleDedup.logOnce(key, message, data);
};

export const logWithCount = (key, message, data = null) => {
  globalConsoleDedup.logWithCount(key, message, data);
};

export const clearConsoleDedup = () => {
  globalConsoleDedup.clear();
};

export const getConsoleStats = () => {
  return globalConsoleDedup.getStats();
};
