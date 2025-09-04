"use client";

import * as React from "react";
import { AttributionControl, Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const InteractiveMap = () => {
  return (
    <Map
      reuseMaps
      initialViewState={{
        longitude: -122.4,
        latitude: 37.8,
        zoom: 8,
      }}
      style={{ width: "100%", height: "100%", borderRadius: "12px" }}
      mapStyle="https://demotiles.maplibre.org/style.json"
      // mapStyle="https://tiles.openfreemap.org/styles/liberty"
      attributionControl={false}
    >
      <AttributionControl compact={true} />
    </Map>
  );
};

export default InteractiveMap;
