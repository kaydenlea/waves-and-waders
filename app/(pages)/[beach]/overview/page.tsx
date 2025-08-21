"use client";

import React, { useState, useEffect } from "react";
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
  type Beach,
  type BeachWithFeatures,
  type ForecastData,
  type DailyConditions,
} from "@/lib/supabase";

interface PageProps {
  // Read ?id=<beach.id> from the URL
  searchParams: { id?: string };
}

// Get default beach preference
const getDefaultBeach = (beaches: Beach[]): Beach | null => {
  const preferredBeaches = ["Huntington Beach", "Malibu", "Santa Monica", "Laguna Beach"];
  for (const preferred of preferredBeaches) {
    const found = beaches.find((b) => b.Name.includes(preferred));
    if (found) return found;
  }
  return beaches[0] || null;
};

const Page = ({ searchParams }: PageProps) => {
  // State management
  const [selectedBeach, setSelectedBeach] = useState<Beach | null>(null);
  const [beachDetail, setBeachDetail] = useState<BeachWithFeatures | null>(null); // ← features
  const [allBeaches, setAllBeaches] = useState<Beach[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [weeklyForecastData, setWeeklyForecastData] = useState<ForecastData[]>([]);
  const [dailyConditions, setDailyConditions] = useState<DailyConditions | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load beaches on mount or when searchParams change
  useEffect(() => {
    const loadBeaches = async () => {
      try {
        setLoading(true);
        const beaches = await fetchAllBeaches();
        setAllBeaches(beaches);

        // Prefer selecting by id from ?id=...
        const { id } = searchParams || {};
        let foundBeach: Beach | null = null;

        if (id) {
          foundBeach = beaches.find((b) => String(b.id) === String(id)) || null;
        } else {
          // No id provided — pick a sensible default
          foundBeach = getDefaultBeach(beaches);
        }

        if (foundBeach) {
          setSelectedBeach(foundBeach);
        } else {
          setSelectedBeach(null);
          setBeachDetail(null);
        }
      } catch (err) {
        setError("Failed to load beaches");
        console.error("Error loading beaches:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBeaches();
  }, [searchParams]);

  // Load beach features/details when a beach is selected
  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedBeach) {
        setBeachDetail(null);
        return;
      }
      try {
        const detail = await fetchBeachDetails(selectedBeach.id);
        setBeachDetail(detail);
      } catch (e) {
        console.error("Error loading beach details:", e);
        setBeachDetail(null);
      }
    };
    loadDetails();
  }, [selectedBeach]);

  // Load weekly forecast for date picker when beach changes
  useEffect(() => {
    const loadWeeklyForecast = async () => {
      if (!selectedBeach) return;

      try {
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        endDate.setHours(23, 59, 59, 999);

        const weeklyData = await fetchBeachForecast(selectedBeach.id, startDate, endDate);
        setWeeklyForecastData(weeklyData);

        console.log(
          `Loaded ${weeklyData.length} weekly forecast records for ${selectedBeach.Name}`
        );
      } catch (error) {
        console.error("Error loading weekly forecast for date picker:", error);
      }
    };

    loadWeeklyForecast();
  }, [selectedBeach]);

  // Load daily forecast data when beach or date changes
  useEffect(() => {
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
        setForecastData(data);

        console.log(
          `Loaded ${data.length} daily forecast records for ${selectedBeach.Name} (ID: ${selectedBeach.id}) on ${selectedDate.toLocaleDateString()}`
        );
      } catch (err) {
        setError("Failed to load forecast data");
        console.error("Error loading forecast:", err);
      } finally {
        setLoading(false);
      }
    };

    loadForecastData();
  }, [selectedBeach, selectedDate]);

  // Load daily conditions when beach or date changes
  useEffect(() => {
    const loadDaily = async () => {
      if (!selectedBeach) return;

      try {
        const daily = await fetchDailyConditions(selectedBeach.COUNTY, selectedDate);
        setDailyConditions(daily);

        if (daily) {
          console.log(
            `Loaded daily conditions for ${selectedBeach.COUNTY} on ${selectedDate.toLocaleDateString()}:`,
            {
              sunrise: daily.sunrise,
              sunset: daily.sunset,
              moonPhase: daily.moon_phase,
            }
          );
        } else {
          console.warn(
            `No daily conditions found for ${selectedBeach.COUNTY} on ${selectedDate.toLocaleDateString()}`
          );
        }
      } catch (error) {
        console.error("Error loading daily conditions:", error);
        setDailyConditions(null);
      }
    };

    loadDaily();
  }, [selectedBeach, selectedDate]);

  // Helpers for current day/hour views
  const getDayForecastData = (): ForecastData[] => {
    return forecastData.filter((data) => {
      const dataDate = new Date(data.timestamp);
      return dataDate.toDateString() === selectedDate.toDateString();
    });
  };

  const getCurrentHourData = (): ForecastData | null => {
    const dayData = getDayForecastData();
    const targetTime = new Date(selectedDate);
    targetTime.setHours(selectedHour, 0, 0, 0);

    return (
      dayData.find((data) => {
        const dataTime = new Date(data.timestamp);
        return dataTime.getHours() === selectedHour;
      }) || dayData[0] || null
    );
  };

  const formatSelectedDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    const isToday = date.toDateString() === new Date().toDateString();
    const newHour = isToday ? new Date().getHours() : 9;
    setSelectedHour(newHour);
  };

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
  };

  const handleBeachChange = (beach: Beach) => {
    setSelectedBeach(beach);
    // Optionally update URL here if you add a local switcher:
    // router.push(`/beach/overview?id=${encodeURIComponent(String(beach.id))}`);
  };

  const dayForecastData = getDayForecastData();
  const currentHourData = getCurrentHourData();

  // Loading
  if (loading && !selectedBeach) {
    return (
      <div className="@container">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3">Loading beach data...</span>
        </div>
      </div>
    );
  }

  // No beach found
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
    <div className="@container">
      <header className="mb-6">
        <h1 className="font-semibold text-3xl tracking-tight">{selectedBeach.Name}</h1>
        <p className="text-gray-600 mt-1">
          {selectedBeach.COUNTY} County • {selectedBeach.LATITUDE.toFixed(4)},{" "}
          {selectedBeach.LONGITUDE.toFixed(4)}
          {forecastData.length > 0 && (
            <span className="ml-2 text-green-600">• {forecastData.length} forecast points loaded</span>
          )}
        </p>
      </header>

      {/* Summary Section */}
      <section className="mb-8">
        <h2 className="mb-2">{formatSelectedDate(selectedDate)}</h2>
        <Summary
          currentForecast={currentHourData}
          beach={beachDetail ?? selectedBeach}
          todayForecast={dayForecastData}
          selectedHour={selectedHour}
          dailyConditions={dailyConditions}
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

        <div className="mt-2 mb-4">
          {/* DatePicker with weekly overview */}
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            forecastData={weeklyForecastData}
            minDate={new Date()}
            maxDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
          />

          {/* HourSlider with daily detail */}
          <HourSlider
            selectedHour={selectedHour}
            onHourChange={handleHourChange}
            forecastData={dayForecastData}
            selectedDate={selectedDate}
            showDataIndicators={true}
          />
        </div>

        {/* Current selection info */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Selected:</strong>{" "}
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
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

        {/* Swell + Surf row */}
        <div className="flex flex-col @min-3xl:flex-row gap-2">
          <figure className="flex-1 min-w-0">
            <SwellChart data={dayForecastData} selectedHour={selectedHour} />
          </figure>
          <figure className="flex-1 min-w-0">
            <SurfChart data={dayForecastData} selectedHour={selectedHour} />
          </figure>
        </div>

        <figure className="hidden">
          <WindChart data={dayForecastData} selectedHour={selectedHour} />
        </figure>

        <figure>
          <StatTable data={dayForecastData} visibleCols={3} className="@min-3xl:hidden" />
          <StatTable data={dayForecastData} className="hidden @min-3xl:block" />
        </figure>
      </section>

      {/* Debug info - remove in production */}
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
                dayForecastDataCount: dayForecastData.length,
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
                queryUsed: `county='${selectedBeach?.COUNTY}' AND date='${selectedDate
                  .toISOString()
                  .split("T")[0]}'`,
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
