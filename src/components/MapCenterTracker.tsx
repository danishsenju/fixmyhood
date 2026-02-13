"use client";

import { useMapEvents } from "react-leaflet";

interface MapCenterTrackerProps {
  onCenterChange: (lat: number, lng: number) => void;
}

export function MapCenterTracker({ onCenterChange }: MapCenterTrackerProps) {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      onCenterChange(center.lat, center.lng);
    },
  });
  return null;
}
