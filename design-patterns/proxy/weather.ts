// weather-proxy.ts
import crypto from 'crypto'

// --------- CONTRACT ----------
interface WeatherService {
  getWeather(city: string): Promise<string> // returns a simple JSON string
}

// --------- REAL SUBJECT ----------
class RealWeatherService implements WeatherService {
  async getWeather(city: string): Promise<string> {
    // Simulate REST call: takes 800 ms
    await new Promise(r => setTimeout(r, 800))
    const temp = (Math.random() * 35 + 5).toFixed(1)
    return JSON.stringify({ city, temp, at: new Date().toISOString() })
  }
}

// --------- PROXY (with cache + rate-limit) ----------
class WeatherProxy implements WeatherService {
  private cache = new Map<string, { data: string, ts: number }>()
  private readonly TTL = 10 * 60 * 1000 // 10 minutes
  private readonly maxPerHour = 60
  private callLog: number[] = [] // stores timestamp in ms

  constructor(private real: RealWeatherService) { }

  async getWeather(city: string): Promise<string> {
    const key = crypto.createHash('md5').update(city).digest('hex')

    // 1️⃣ If valid cache exists → return immediately
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.ts < this.TTL) {
      console.log('⚡ Cache hit →', city)
      return cached.data
    }

    // 2️⃣ Check quota 60/h
    this.cleanupLog()
    if (this.callLog.length >= this.maxPerHour) {
      throw new Error('⛔ Rate-limit exceeded (60 requests/hour)')
    }

    // 3️⃣ Call real API + log
    const data = await this.real.getWeather(city)
    this.cache.set(key, { data, ts: Date.now() })
    this.callLog.push(Date.now())
    console.log('🌐 Fetched →', city)
    return data
  }

  private cleanupLog() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    this.callLog = this.callLog.filter(t => t > oneHourAgo)
  }
}