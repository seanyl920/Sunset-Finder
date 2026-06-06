import { useState } from "react";

export default function SearchBar({ onSearch, onLocate, loading }) {
  const [value, setValue] = useState("");

  function submit(e) {
    e.preventDefault();
    const city = value.trim();
    if (city) onSearch(city);
  }

  return (
    <form className="search" onSubmit={submit}>
      <input
        className="search__input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter a city…"
        aria-label="City"
        autoComplete="off"
      />
      <button className="search__btn" type="submit" disabled={loading}>
        Forecast
      </button>
      <button
        className="search__locate"
        type="button"
        onClick={onLocate}
        disabled={loading}
        title="Use my current location"
      >
        <span aria-hidden="true">◎</span> My location
      </button>
    </form>
  );
}
