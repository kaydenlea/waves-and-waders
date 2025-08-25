"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import DatePicker from "@/components/general/DatePicker";
import HourSlider from "@/components/general/HourSlider";
import SurfChart from "@/components/graphs/SurfChart";
import SwellChart from "@/components/graphs/SwellChart";
import { TideChart } from "@/components/graphs/TideChart";
import WindChart from "@/components/graphs/WindChart";
import Highlights from "@/components/visuals/Highlights";
import StatTable from "@/components/visuals/StatTable";
import Summary from "@/components/visuals/Summary";

import {
  fetchBeachForecast,
  fetchAllBeaches,
  fetchDailyConditions,
  fetchBeachDetails,
  // NEW: fallback direct id fetch (add this helper in lib if you don't have it yet)
  fetchBeachByIdLoose,
  type Beach,
  type BeachWithFeatures,
  type ForecastData,
  type DailyConditions,
} from "@/lib/supabase";

interface PageProps {
  searchParams: { id?: string };
}

// Pick a sensible default if no id provided
const getDefaultBeach = (beaches: Beach[]): Beach | null => {
  const preferred = ["Huntington Beach", "Malibu", "Santa Monica", "Laguna Beach"];
  for (const name of preferred) {
    const found = beaches.find((b) => b.Name.includes(name));
    if (found) return found;
  }
  return beaches[0] ?? null;
};

const Page = ({ searchParams }: PageProps) => {
  const router = useRouter();

  // State
  const [selectedBeach, setSelectedBeach] = useState<Beach | null>(null);
  const [beachDetail, setBeachDetail] = useState<Beach | null>(null);
  const [allBeaches, setAllBeaches] = useState<Beach[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [weeklyForecastData, setWeeklyForecastData] = useState<ForecastData[]>([]);
  const [dailyConditions, setDailyConditions] = useState<DailyConditions | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -------- Load beaches + resolve selected beach (by id if present) --------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const beaches = await fetchAllBeaches();
        if (cancelled) return;
        setAllBeaches(beaches);

        const urlId = searchParams?.id?.trim();
        if (urlId) {
          // Direct fetch by id (bypasses any preloaded list/pagination issues)
          const byId = await fetchBeachByIdLoose(urlId);
          if (cancelled) return;

          if (byId) {
            setSelectedBeach(byId);
            setBeachDetail(null); // details will be fetched below
            return;
          }

          // Fallback to local list (if direct fetch didn't find it)
          const found = beaches.find((b) => String(b.id) === String(urlId)) || null;
          setSelectedBeach(found);
          setBeachDetail(null);
          return;
        }

        // No id in URL → pick a default
        const def = getDefaultBeach(beaches);
        setSelectedBeach(def);
        setBeachDetail(null);
      } catch (err: any) {
        console.error("Error loading beaches:", err);
        setError(
          `Failed to load beaches${err?.message ? `: ${err.message}` : ""}`
        );
        setSelectedBeach(null);
        setBeachDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // -------- Load extended details for the selected beach --------
  useEffect(() => {
    let cancelled = false;

    const loadDetails = async () => {
      if (!selectedBeach) {
        console.log('No selectedBeach, clearing beachDetail');
        setBeachDetail(null);
        return;
      }
      
      try {
        console.log('Loading details for beach:', selectedBeach.id, selectedBeach.Name);
        
        // Avoid refetch if we already have details for this id
        if (beachDetail?.id === selectedBeach.id) {
          console.log('Already have details for this beach, skipping fetch');
          return;
        }

        console.log('Calling fetchBeachDetails with id:', selectedBeach.id);
        const detail = await fetchBeachDetails(selectedBeach.id);
        console.log('fetchBeachDetails returned:', detail);
        
        if (!cancelled) {
          console.log('Setting beachDetail to:', detail);
          setBeachDetail(detail);
        }
      } catch (e) {
        console.error("Error loading beach details:", e);
        if (!cancelled) setBeachDetail(null);
      }
    };

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedBeach, beachDetail?.id]); // Added beachDetail?.id to dependencies

  // -------- Weekly forecast (for date picker mini-graph) --------
  useEffect(() => {
    let cancelled = false;

    const loadWeeklyForecast = async () => {
      if (!selectedBeach) return;
      try {
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        endDate.setHours(23, 59, 59, 999);

        const weekly = await fetchBeachForecast(selectedBeach.id, startDate, endDate);
        if (!cancelled) setWeeklyForecastData(weekly);
      } catch (error) {
        console.error("Error loading weekly forecast for date picker:", error);
      }
    };

    loadWeeklyForecast();
    return () => {
      cancelled = true;
    };
  }, [selectedBeach]);

  // -------- Daily forecast (charts) --------
  useEffect(() => {
    let cancelled = false;

    const loadForecastData = async () => {
      if (!selectedBeach) return;

      try {
        setLoading(true);
        setError(null);

        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);

        const data = await fetchBeachForecast(selectedBeach.id, startDate, endDate);
        if (!cancelled) setForecastData(data);
      } catch (err: any) {
        console.error("Error loading forecast:", err);
        if (!cancelled)
          setError(`Failed to load forecast data${err?.message ? `: ${err.message}` : ""}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadForecastData();
    return () => {
      cancelled = true;
    };
  }, [selectedBeach, selectedDate]);

  // -------- Daily county conditions (sunrise/sunset, moon) --------
  useEffect(() => {
    let cancelled = false;

    const loadDaily = async () => {
      if (!selectedBeach) return;
      try {
        const daily = await fetchDailyConditions(selectedBeach.COUNTY, selectedDate);
        if (!cancelled) setDailyConditions(daily);
      } catch (error) {
        console.error("Error loading daily conditions:", error);
        if (!cancelled) setDailyConditions(null);
      }
    };

    loadDaily();
    return () => {
      cancelled = true;
    };
  }, [selectedBeach, selectedDate]);

  // -------- Helpers --------
  const getDayForecastData = (): ForecastData[] =>
    forecastData.filter((d) => new Date(d.timestamp).toDateString() === selectedDate.toDateString());

  const getCurrentHourData = (): ForecastData | null => {
    const day = getDayForecastData();
    const match = day.find((d) => new Date(d.timestamp).getHours() === selectedHour);
    return match || day[0] || null;
  };

  const formatSelectedDate = (date: Date): string =>
    date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    const isToday = date.toDateString() === new Date().toDateString();
    setSelectedHour(isToday ? new Date().getHours() : 9);
  };

  const handleHourChange = (hour: number) => setSelectedHour(hour);

  // When a user chooses a beach (search/map), also update the URL
  const handleBeachChange = (beach: Beach) => {
    setSelectedBeach(beach);
    router.push(`?id=${encodeURIComponent(String(beach.id))}`);
  };

  // -------- Derived --------
  const dayForecastData = getDayForecastData();
  const currentHourData = getCurrentHourData();

  // -------- UI --------
  if (loading && !selectedBeach) {
    return (
      <div className="@container">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3">Loading beach data...</span>
        </div>
      </div>
    );
  }

  if (!selectedBeach) {
    return (
      <div className="@container">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Beach Not Found</h1>
          <p className="text-gray-600 mb-4">
            We couldn't find a beach for id "{searchParams.id ?? "N/A"}".
          </p>
          <p className="text-sm text-gray-500">
            Available beaches: {allBeaches.slice(0, 5).map((b) => b.Name).join(", ")}
            {allBeaches.length > 5 && ` and ${allBeaches.length - 5} more`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="content-container" className="@container">
      <header className="mb-6">
        <h1 className="font-semibold text-3xl tracking-tight">{selectedBeach.Name}</h1>
        <p className="text-gray-600 mt-1">
          {selectedBeach.COUNTY} County • {selectedBeach.LATITUDE.toFixed(4)}, {selectedBeach.LONGITUDE.toFixed(4)}
          {forecastData.length > 0 && (
            <span className="ml-2 text-green-600">• {forecastData.length} forecast points loaded</span>
          )}
        </p>
      </header>

      {/* Summary */}
      <section className="mb-8">
        <h2 className="mb-2">{formatSelectedDate(selectedDate)}</h2>
        <Summary
          currentForecast={currentHourData}
          beach={beachDetail ?? selectedBeach} // BACK TO ORIGINAL - fallback to selectedBeach
          todayForecast={dayForecastData}
          selectedHour={selectedHour}
        />
      </section>

      <section className="flex flex-col gap-2 w-full">
        <header>
          <h2 className="text-2xl font-semibold">Daily Forecast</h2>
          <p className="text-sm">
            {dayForecastData.length > 0
              ? `${dayForecastData.length} hours of forecast data available`
              : "Select a date to view forecast"}
          </p>
        </header>

        {/* Daily conditions status */}
        {selectedBeach && (
          <div className="mb-2 text-xs text-gray-500">
            Daily conditions for {selectedBeach.COUNTY} County:{" "}
            {dailyConditions
              ? `✅ Sunrise: ${dailyConditions.sunrise}, Sunset: ${dailyConditions.sunset}, Moon: ${
                  dailyConditions.moon_phase ? (dailyConditions.moon_phase * 100).toFixed(0) + "%" : "N/A"
                }`
              : "❌ No daily data available"}
          </div>
        )}

        {/* Date + Hour controls */}
        <div className="mt-2 mb-4">
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            forecastData={weeklyForecastData}
            minDate={new Date()}
            maxDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
          />
          <HourSlider
            selectedHour={selectedHour}
            onHourChange={handleHourChange}
            forecastData={dayForecastData}
            selectedDate={selectedDate}
            showDataIndicators
          />
        </div>

        {/* Selected time snapshot */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Selected:</strong>{" "}
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}{" "}
            at {selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour}
            {selectedHour >= 12 ? "PM" : "AM"}
          </p>

          {currentHourData ? (
            <p className="text-sm text-blue-600 mt-1">
              Surf: {currentHourData.surf.heightMax?.toFixed(1) || "N/A"}ft • Wind:{" "}
              {currentHourData.conditions.windSpeed?.toFixed(0) || "N/A"}mph • Water:{" "}
              {currentHourData.conditions.waterTemp?.toFixed(0) || "N/A"}°F
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">No data available for this time</p>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Highlights + Tide */}
        <div className="grid grid-cols-1 @min-3xl:grid-cols-[1.25fr_1fr] gap-2 items-start">
          <section className="min-w-0">
            <Highlights
              beachId={selectedBeach.id}
              county={selectedBeach.COUNTY}
              currentData={currentHourData}
              dailyConditions={dailyConditions}
              className="w-full"
            />
          </section>

          <figure className="min-w-0">
            <TideChart
              data={dayForecastData}
              selectedHour={selectedHour}
              selectedDate={selectedDate}
              dailyConditions={dailyConditions}
              beach={selectedBeach}
              className="w-full"
            />
          </figure>
        </div>

        {/* Swell + Surf */}
        <div className="flex flex-col @min-3xl:flex-row gap-2">
          <figure className="flex-1 min-w-0">
            <SwellChart data={dayForecastData} selectedHour={selectedHour} />
          </figure>
          <figure className="flex-1 min-w-0">
            <SurfChart data={dayForecastData} selectedHour={selectedHour} />
          </figure>
        </div>

        {/* Optional wind chart */}
        <figure className="hidden">
          <WindChart data={dayForecastData} selectedHour={selectedHour} />
        </figure>

        {/* Stats table */}
        <figure>
          <StatTable data={dayForecastData} visibleCols={3} className="@min-3xl:hidden" />
          <StatTable data={dayForecastData} className="hidden @min-3xl:block" />
        </figure>
      </section>

      {/* Debug (dev only) */}
      {process.env.NODE_ENV === "development" && (
        <details className="mt-8 p-4 bg-gray-100 rounded">
          <summary className="cursor-pointer font-medium">🔍 Debug Info</summary>
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify(
              {
                urlParamId: searchParams.id ?? null,
                selectedBeachId: selectedBeach?.id,
                selectedBeachName: selectedBeach?.Name,
                selectedCounty: selectedBeach?.COUNTY,
                weeklyForecastDataCount: weeklyForecastData.length,
                forecastDataCount: forecastData.length,
                dayForecastDataCount: getDayForecastData().length,
                currentHourData: !!currentHourData,
                selectedDate: selectedDate.toISOString().split("T")[0],
                selectedHour,
                currentHourSurf: currentHourData?.surf.heightMax,
                currentHourWind: currentHourData?.conditions.windSpeed,
                currentHourTemp: currentHourData?.conditions.waterTemp,
                dailyConditions: dailyConditions
                  ? {
                      date: dailyConditions.date,
                      sunrise: dailyConditions.sunrise,
                      sunset: dailyConditions.sunset,
                      moonPhase: dailyConditions.moon_phase,
                    }
                  : null,
                queryUsed: `county='${selectedBeach?.COUNTY}' AND date='${
                  selectedDate.toISOString().split("T")[0]
                }'`,
                beachDetailLoaded: !!beachDetail,
                features: beachDetail
                  ? {
                      FISHING: beachDetail.FISHING,
                      RESTROOMS: beachDetail.RESTROOMS,
                      PARKING: beachDetail.PARKING,
                      DOG_FRIEND: beachDetail.DOG_FRIEND,
                      SNDY_BEACH: beachDetail.SNDY_BEACH,
                      LIFEGUARD: beachDetail.LIFEGUARD,
                    }
                  : null,
              },
              null,
              2
            )}
          </pre>
        </details>
      )}
    </div>
  );
};

export default Page;