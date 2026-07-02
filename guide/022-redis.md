# Redis Integration and Caching

Redis is an open-source, in-memory data structure store used as a database, cache, message broker, and queue.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics: RAM vs. Disk Latency
- **Disk Databases (e.g. MongoDB, PostgreSQL)**: Save data to persistent solid-state drives (SSDs). Reading from disk requires physical I/O operations, which typically take 1 to 10 milliseconds.
- **In-Memory Databases (e.g. Redis)**: Save data directly in RAM memory. Reading from RAM is extremely fast, typically taking less than a millisecond (microseconds).

### What is Caching?
Caching is the process of storing copies of frequently accessed data in a fast, in-memory database like Redis. 
- **Cache Hit**: The requested data is found in the cache, and returned immediately.
- **Cache Miss**: The data is not found in the cache. The server must query the primary database, save a copy of the result in the cache, and then return it to the user.

---

## 2. Theory & Deep Dive

### Cache Invalidation & TTL
- **TTL (Time To Live)**: An expiration timer set on cache keys. After the TTL expires, Redis automatically deletes the key, ensuring the next request triggers a cache miss and fetches fresh data from the primary database.
- **Cache Invalidation**: The process of deleting cache keys manually when updates or writes occur in the primary database, preventing clients from reading stale cached data.

---

## 3. Code Implementation

Before coding, install the Redis Node client: `npm install redis`

Make sure you have a local Redis server running (default port `6379`).

```javascript
const express = require("express");
const redis = require("redis");
const app = express();

const PORT = 3000;

// 1. Initialize Redis Client
const redisClient = redis.createClient({
  url: "redis://127.0.0.1:6379"
});

redisClient.on("error", (err) => console.error("Redis Connection Error:", err));
redisClient.on("connect", () => console.log("Successfully connected to Redis server!"));

(async () => {
  await redisClient.connect();
})();
```

---

## 4. Self-Contained Mini-Project: Weather Data Cache API

We will build an Express application that queries weather data. To simulate a slow API call, we will add a 3-second delay to the database query, and cache the results in Redis with a 30-second TTL.

### Project Setup
```text
express-redis-weather/
├── server.js
└── package.json (requires: express, redis)
```

### File: `server.js`
```javascript
const express = require("express");
const redis = require("redis");
const app = express();

const client = redis.createClient({ url: "redis://127.0.0.1:6379" });
client.connect().then(() => console.log("Redis Active"));

// Mock slow weather service
async function getLiveWeather(city) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        city: city,
        temp: Math.floor(Math.random() * 15) + 20, // 20 - 35 C
        conditions: "Sunny",
        updatedAt: new Date().toLocaleTimeString()
      });
    }, 3000); // 3 seconds delay simulation
  });
}

app.get("/weather/:city", async (req, res) => {
  try {
    const city = req.params.city.toLowerCase();
    const cacheKey = `weather:${city}`;

    // 1. Check Cache
    const cachedWeather = await client.get(cacheKey);
    if (cachedWeather) {
      console.log("[CACHE HIT] Serving from Redis");
      return res.json({ source: "Redis Cache", data: JSON.parse(cachedWeather) });
    }

    // 2. Cache Miss -> Query Database
    console.log("[CACHE MISS] Fetching live data...");
    const weather = await getLiveWeather(city);

    // 3. Save to Redis with a 30-second TTL
    await client.set(cacheKey, JSON.stringify(weather), { EX: 30 });

    res.json({ source: "Live Database Query", data: weather });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Cache Invalidation Route
app.delete("/weather/:city/clear", async (req, res) => {
  const city = req.params.city.toLowerCase();
  await client.del(`weather:${city}`);
  res.json({ message: `Cache cleared for city: ${city}` });
});

app.listen(3000, () => console.log("Weather API active at http://localhost:3000/weather/mumbai"));
```

---

## 5. Advanced Production Practices & Security

### Handling Redis Connection Outages Gracefully
If your Redis server crashes in production, your application should not crash with it.
- **Solution**: Configure your Redis client to fail gracefully. If a connection error occurs, intercept the error and fall back to querying the primary database directly:
  ```javascript
  // Example middleware to check Redis connection status before querying the cache
  app.use((req, res, next) => {
    req.cacheEnabled = client.isOpen; // Check if Redis is online
    next();
  });
  ```

### Cache Stampede (Thundering Herd)
When a highly popular cache key expires (e.g. your home page data), hundreds of concurrent requests will experience a cache miss simultaneously. They will all query the primary database at the same time, which can overload the database and crash your application.
- **Solution**: Use mutual exclusion locks (mutex locks) or background tasks to refresh cache keys before they expire.

---

## 6. Key Takeaways
1. Set an **Expiration Time (`EX` options)** on keys. Otherwise, the data will persist in memory forever, leading to memory leaks and stale data.
2. Remember to **invalidate the cache (delete the key)** when updates, deletions, or writes occur in the primary database, ensuring clients always see fresh data.
3. Stringify complex structures (`JSON.stringify`) before writing to Redis, and parse them (`JSON.parse`) after retrieving, as Redis works primarily with string values for simple caching.
