"use client";

import React from "react";
import StatTable from "../../visuals/StatTable";

type Props = {
  beachId?: string;
  numHours: number;
  numDays: number;
  header?: boolean;
  date?: Date;
};

export const LazyLoadTable: React.FC<Props> = (props) => {
  return <StatTable {...props} />;
};
