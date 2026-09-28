// Device Context & Live Environment Services (Time, Timezone, Geolocation, Weather)

export interface DeviceTimeInfo {
  time12: string;
  time24: string;
  date: string;
  day: string;
  timezone: string;
  timezoneOffsetMinutes: number;
  offsetString: string;
  iso: string;
}

export interface DeviceLocationInfo {
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country?: string;
  source: 'gps' | 'ip' | 'timezone_fallback';
}

export interface LiveWeatherInfo {
  locationName: string;
  temperatureC: number;
  temperatureF: number;
  apparentTemperatureC: number;
  condition: string;
  conditionUrdu: string;
  humidity: number;
  windSpeedKmH: number;
  precipitationMm: number;
  isDay: boolean;
  weatherCode: number;
}

export interface FullDeviceContext {
  time: DeviceTimeInfo;
  location: DeviceLocationInfo;
  weather?: LiveWeatherInfo;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  locale: string;
}

// Weather code description mapping (WMO standard)
export function interpretWeatherCode(code: number): { en: string; urdu: string } {
  switch (code) {
    case 0:
      return { en: 'Clear sky / Sunny', urdu: 'Saaf asman / Khula dhoop' };
    case 1:
      return { en: 'Mainly clear', urdu: 'Zyadatar saaf' };
    case 2:
      return { en: 'Partly cloudy', urdu: 'Halke badal / Tukray' };
    case 3:
      return { en: 'Overcast / Cloudy', urdu: 'Badal chahe hue' };
    case 45:
    case 48:
      return { en: 'Fog / Mist', urdu: 'Dhund / Kohar' };
    case 51:
    case 53:
    case 55:
      return { en: 'Light drizzle', urdu: 'Halki boondabandi' };
    case 61:
      return { en: 'Slight rain', urdu: 'Halki barish' };
    case 63:
      return { en: 'Moderate rain', urdu: 'Darmiyani barish' };
    case 65:
      return { en: 'Heavy rain', urdu: 'Tez barish' };
    case 71:
    case 73:
    case 75:
      return { en: 'Snowfall', urdu: 'Barfbari' };
    case 80:
    case 81:
    case 82:
      return { en: 'Rain showers', urdu: 'Barish ke jhokay' };
    case 95:
      return { en: 'Thunderstorm', urdu: 'Toofan aur garaj-chamak' };
    case 96:
    case 99:
      return { en: 'Thunderstorm with hail', urdu: 'Olay aur toofani garaj' };
    default:
      return { en: 'Clear', urdu: 'Saaf' };
  }
}

export class DeviceContextManager {
  private static instance: DeviceContextManager | null = null;
  private cachedLocation: DeviceLocationInfo | null = null;
  private cachedWeather: LiveWeatherInfo | null = null;
  private lastWeatherFetchTime = 0;

  public static getInstance(): DeviceContextManager {
    if (!DeviceContextManager.instance) {
      DeviceContextManager.instance = new DeviceContextManager();
    }
    return DeviceContextManager.instance;
  }

  // Returns live device clock time, formatted in user's actual local timezone
  public getLiveTimeInfo(): DeviceTimeInfo {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi';
    const offsetMin = -now.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const offsetHrs = Math.floor(absMin / 60)
      .toString()
      .padStart(2, '0');
    const offsetMins = (absMin % 60).toString().padStart(2, '0');
    const offsetString = `UTC${sign}${offsetHrs}:${offsetMins}`;

    const time12Formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const time24Formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
    });

    return {
      time12: time12Formatter.format(now),
      time24: time24Formatter.format(now),
      date: dateFormatter.format(now),
      day: dayFormatter.format(now),
      timezone,
      timezoneOffsetMinutes: offsetMin,
      offsetString,
      iso: now.toISOString(),
    };
  }

  public detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent.toLowerCase();
    if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua)) {
      return 'tablet';
    }
    if (/(mobi|ipod|phone|blackberry|opera mini|fennec|minimo|symbian|psp|nintendo ds)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // Detects the user's location via GPS (if allowed) or via fast IP geolocation
  public async detectLocation(): Promise<DeviceLocationInfo> {
    if (this.cachedLocation) {
      return this.cachedLocation;
    }

    // 1. Try Browser Geolocation API first
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 6000,
            maximumAge: 120000,
            enableHighAccuracy: false,
          });
        });

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Try reverse-geocoding coordinates to get City/Country name via Open-Meteo or BigDataCloud
        let city = '';
        let country = '';
        let region = '';

        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            city = revData.city || revData.locality || revData.principalSubdivision || '';
            country = revData.countryName || '';
            region = revData.principalSubdivision || '';
          }
        } catch (e) {
          console.warn('[DeviceContext] Reverse geocode notice, using coordinates directly:', e);
        }

        this.cachedLocation = {
          latitude: lat,
          longitude: lon,
          city: city || 'Local Area',
          region,
          country,
          source: 'gps',
        };

        return this.cachedLocation;
      } catch (geoErr) {
        console.log('[DeviceContext] GPS prompt skipped or denied, resolving via network/timezone fallback');
      }
    }

    // 2. Network IP Geolocation Fallback
    try {
      const ipRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.latitude && ipData.longitude) {
          this.cachedLocation = {
            latitude: ipData.latitude,
            longitude: ipData.longitude,
            city: ipData.city || ipData.region || '',
            region: ipData.region || '',
            country: ipData.country_name || '',
            source: 'ip',
          };
          return this.cachedLocation;
        }
      }
    } catch (ipErr) {
      console.warn('[DeviceContext] IP lookup notice:', ipErr);
    }

    // 3. Timezone Heuristic Fallback (e.g., Asia/Karachi -> Pakistan)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    let fallbackCity = 'Local Area';
    let fallbackCountry = '';
    let fallbackLat = 31.5204;
    let fallbackLon = 74.3587;

    if (tz.includes('Karachi') || tz.includes('Islamabad') || tz.includes('Lahore') || tz.includes('Asia/Karachi')) {
      fallbackCity = 'Islamabad / Lahore / Karachi';
      fallbackCountry = 'Pakistan';
      fallbackLat = 31.5204;
      fallbackLon = 74.3587;
    } else if (tz.includes('Kolkata') || tz.includes('Calcutta') || tz.includes('Delhi') || tz.includes('Mumbai')) {
      fallbackCity = 'New Delhi / Mumbai';
      fallbackCountry = 'India';
      fallbackLat = 28.6139;
      fallbackLon = 77.209;
    } else if (tz.includes('Dubai') || tz.includes('Riyadh')) {
      fallbackCity = 'Dubai / Riyadh';
      fallbackCountry = 'UAE / Saudi Arabia';
      fallbackLat = 25.2048;
      fallbackLon = 55.2708;
    } else if (tz.includes('London')) {
      fallbackCity = 'London';
      fallbackCountry = 'United Kingdom';
      fallbackLat = 51.5074;
      fallbackLon = -0.1278;
    } else if (tz.includes('New_York') || tz.includes('America/')) {
      fallbackCity = 'New York';
      fallbackCountry = 'United States';
      fallbackLat = 40.7128;
      fallbackLon = -74.006;
    }

    this.cachedLocation = {
      latitude: fallbackLat,
      longitude: fallbackLon,
      city: fallbackCity,
      country: fallbackCountry,
      source: 'timezone_fallback',
    };

    return this.cachedLocation;
  }

  // Fetches live real-time weather from Open-Meteo
  public async fetchLiveWeather(lat?: number, lon?: number, locationName?: string): Promise<LiveWeatherInfo | null> {
    const now = Date.now();
    // Cache for 5 minutes if matching current location
    if (!lat && !lon && this.cachedWeather && now - this.lastWeatherFetchTime < 300000) {
      return this.cachedWeather;
    }

    try {
      let targetLat = lat;
      let targetLon = lon;
      let targetName = locationName;

      if (!targetLat || !targetLon) {
        const loc = await this.detectLocation();
        targetLat = loc.latitude || 31.5204;
        targetLon = loc.longitude || 74.3587;
        targetName = loc.city ? `${loc.city}${loc.country ? `, ${loc.country}` : ''}` : 'Your Location';
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(weatherUrl);
      if (!res.ok) throw new Error(`Weather API returned ${res.status}`);

      const data = await res.json();
      const current = data.current;
      if (!current) return null;

      const code = current.weather_code || 0;
      const interp = interpretWeatherCode(code);
      const tempC = Math.round(current.temperature_2m);
      const tempF = Math.round((tempC * 9) / 5 + 32);
      const appTempC = Math.round(current.apparent_temperature);

      const weather: LiveWeatherInfo = {
        locationName: targetName || 'Current Location',
        temperatureC: tempC,
        temperatureF: tempF,
        apparentTemperatureC: appTempC,
        condition: interp.en,
        conditionUrdu: interp.urdu,
        humidity: Math.round(current.relative_humidity_2m || 0),
        windSpeedKmH: Math.round(current.wind_speed_10m || 0),
        precipitationMm: current.precipitation || 0,
        isDay: current.is_day === 1,
        weatherCode: code,
      };

      if (!lat && !lon) {
        this.cachedWeather = weather;
        this.lastWeatherFetchTime = now;
      }

      return weather;
    } catch (err) {
      console.warn('[DeviceContext] Live weather fetch notice:', err);
      return null;
    }
  }

  // Generates comprehensive real-time context payload to send to Gemini Live
  public async getFullContext(): Promise<FullDeviceContext> {
    const time = this.getLiveTimeInfo();
    const location = await this.detectLocation();
    const weather = await this.fetchLiveWeather(location.latitude, location.longitude, location.city);
    const deviceType = this.detectDeviceType();
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

    return {
      time,
      location,
      weather: weather || undefined,
      deviceType,
      locale,
    };
  }
}

export const deviceContext = DeviceContextManager.getInstance();
