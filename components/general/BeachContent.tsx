"use client";

import { ForecastChartProvider } from "../context/ForecastChartContext";
import { SunDataProvider } from "../context/SunDataContext";
import { useClientPath } from "../context/PathContext";
import DateSummaryBridge from "./DateSummaryBridge";
import ForecastBridge from "./ForecastBridge";

const BeachContent = ({ beachId }: { beachId: string }) => {
  const { selectedTab } = useClientPath();
  if (selectedTab === "overview") {
    return <DateSummaryBridge beachId={beachId} />;
  }
  return (
    <SunDataProvider>
      <ForecastChartProvider>
        <ForecastBridge beachId={beachId} />
      </ForecastChartProvider>
    </SunDataProvider>
  );
};

export default BeachContent;
