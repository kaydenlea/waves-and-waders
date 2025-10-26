"use client";

import { ForecastChartProvider } from "../context/ForecastChartContext";
import { useClientPath } from "../context/PathContext";
import DateSummaryBridge from "./DateSummaryBridge";
import ForecastBridge from "./ForecastBridge";

const BeachContent = ({ beachId }: { beachId: string }) => {
  const { selectedTab } = useClientPath();
  if (selectedTab === "overview") {
    return <DateSummaryBridge beachId={beachId} />;
  }
  return (
    <ForecastChartProvider>
      <ForecastBridge beachId={beachId} />
    </ForecastChartProvider>
  );
};

export default BeachContent;
