"use client";

import React from "react";
import StatTable from "../../visuals/StatTable";
import type {
  StatTableDensity,
  StatTableUiState,
  StatTableVariant,
} from "../../visuals/StatTable";

export type {
  StatTableDensity,
  StatTableUiState,
  StatTableVariant,
} from "../../visuals/StatTable";

type Props = {
  beachId?: string;
  numHours: number;
  numDays: number;
  header?: boolean;
  date?: Date;
  variant?: StatTableVariant;
  density?: StatTableDensity;
  onToggleDensity?: () => void;
  onUiStateChange?: (state: StatTableUiState) => void;
};

export const LazyLoadTable: React.FC<Props> = (props) => {
  return <StatTable {...props} />;
};
