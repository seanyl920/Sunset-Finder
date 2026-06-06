import { useState, useCallback } from "react";
import SearchBar from "./components/SearchBar.jsx";
import TodayCard from "./components/TodayCard.jsx";
import Forecast from "./components/Forecast.jsx";
import Spots from "./components/Spots.jsx";
import {
  geocodeCity,
  reverseGeocode,
  getCurrentPosition,
  getForecast,
  getSpots,
} from "./api.js";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState(null); // { lat, lon, label, name }
  const [forecast, setForecast] = useState(null); // { timezone, today, week }

  const [spots, setSpots] = useState([]);
  const [spotsLoading, setSpotsLoading] = useState(false);
  const [spotsError, setSpotsError] = useState("");

  // Run a full lookup for a resolved location.
  const loadFor = useCallback(async (loc) => {
    setLocation(loc);
    setError("");
    setLoading(true);
    setForecast(null);
    setSpots([]);
    setSpotsError("");

    try {
      const fc = await getForecast(loc.lat, loc.lon);
      setForecast(fc);
    } catch (err) {
      setError(err.message || "Couldn't load the forecast.");
      setLoading(false);
      return;
    }
    setLoading(false);

    // Spots load independently — a Claude hiccup shouldn't block the forecast.
    setSpotsLoading(true);
    try {
      const s = await getSpots(loc.name);
      setSpots(s);
    } catch (err) {
      setSpotsError(err.message || "Couldn't load sunset spots.");
    } finally {
      setSpotsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    async (city) => {
      setError("");
      setLoading(true);
      try {
        const loc = await geocodeCity(city);
        await loadFor(loc);
      } catch (err) {
        setError(err.message || "Something went wrong.");
        setLoading(false);
      }
    },
    [loadFor],
  );

  const handleLocate = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const { lat, lon } = await getCurrentPosition();
      const { label, name } = await reverseGeocode(lat, lon);
      await loadFor({ lat, lon, label, name });
    } catch (err) {
      setError(err.message || "Couldn't use your location.");
      setLoading(false);
    }
  }, [loadFor]);

  return (
    <div className="app">
      <div className="sky" aria-hidden="true">
        <div className="sun" />
      </div>

      <main className="container">
        <header className="hero">
          <h1 className="hero__title">Sundown</h1>
          <p className="hero__tagline">
            Find tonight's sunset quality, plan the week ahead, and discover where to watch.
          </p>
          <SearchBar onSearch={handleSearch} onLocate={handleLocate} loading={loading} />
          {error && <p className="hero__error">{error}</p>}
        </header>

        {loading && !forecast && (
          <div className="loading">
            <div className="spinner spinner--lg" />
            <p>Reading the sky…</p>
          </div>
        )}

        {forecast && (
          <div className="results">
            <TodayCard
              today={forecast.today}
              locationLabel={location?.label || location?.name}
            />
            <Forecast week={forecast.week} />
            <Spots
              spots={spots}
              loading={spotsLoading}
              error={spotsError}
              locationLabel={location?.label || location?.name}
            />
          </div>
        )}

        {!forecast && !loading && (
          <div className="empty">
            <p>
              Search a city or use your location to see tonight's{" "}
              <em>Sunset Quality Score</em>.
            </p>
          </div>
        )}

        <footer className="footer">
          Weather by Open-Meteo · sunset times by Sunrise-Sunset · spots by Claude
        </footer>
      </main>
    </div>
  );
}
