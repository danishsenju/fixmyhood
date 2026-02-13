"use client";

import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { Crosshair, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const MapCenterTracker = dynamic(
  () =>
    import("@/components/MapCenterTracker").then((mod) => mod.MapCenterTracker),
  { ssr: false }
);

interface MapReport {
  id: string;
  title: string;
  status: "open" | "acknowledged" | "in_progress" | "closed";
  category: string;
  latitude: number;
  longitude: number;
}

const statusColors: Record<string, string> = {
  open: "#C75050",
  acknowledged: "#B8835F",
  in_progress: "#5D6B7A",
  closed: "#4D8B5A",
};

const categoryOptions = [
  { value: "all", label: "All" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "safety", label: "Safety" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "environment", label: "Environment" },
  { value: "other", label: "Other" },
] as const;

export default function MapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>}>
      <MapPageContent />
    </Suspense>
  );
}

function MapPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pickMode = searchParams.get("pick") === "true";

  const [reports, setReports] = useState<MapReport[]>([]);
  const [center, setCenter] = useState<[number, number]>([3.139, 101.6869]);
  const [pinLat, setPinLat] = useState(3.139);
  const [pinLng, setPinLng] = useState(101.6869);
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchReports = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("reports")
        .select("id, title, status, category, latitude, longitude")
        .eq("is_hidden", false)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(500);

      if (data) {
        setReports(data as MapReport[]);
      }
    };

    fetchReports();
  }, [user]);

  const filteredReports = useMemo(() => {
    if (categoryFilter === "all") return reports;
    return reports.filter((r) => r.category === categoryFilter);
  }, [reports, categoryFilter]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      setCenter([position.coords.latitude, position.coords.longitude]);
      setPinLat(position.coords.latitude);
      setPinLng(position.coords.longitude);
    });
  };

  const handleCenterChange = (lat: number, lng: number) => {
    setPinLat(lat);
    setPinLng(lng);
  };

  const handlePinLocation = () => {
    router.push(
      `/create?lat=${pinLat.toFixed(6)}&lng=${pinLng.toFixed(6)}&location=${pinLat.toFixed(4)}, ${pinLng.toFixed(4)}`
    );
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-16 lg:pb-0">
        {/* Map */}
        <div className="relative w-full h-[calc(100vh-4rem)] lg:h-screen">
          <MapContainer
            center={center}
            zoom={13}
            className="w-full h-full z-0"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterTracker onCenterChange={handleCenterChange} />
            {!pickMode &&
              filteredReports.map((report) => (
                <CircleMarker
                  key={report.id}
                  center={[report.latitude, report.longitude]}
                  radius={10}
                  fillColor={statusColors[report.status] ?? "#EF4444"}
                  fillOpacity={0.9}
                  color="white"
                  weight={2}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{report.title}</p>
                      <p className="text-muted-foreground capitalize">
                        {report.status.replace("_", " ")}
                      </p>
                      <Link
                        href={`/report/${report.id}`}
                        className="text-[var(--primary)] text-xs font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
          </MapContainer>

          {/* Center Pin (pick mode) */}
          {pickMode && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
              <div className="flex flex-col items-center -mt-8">
                <MapPin className="h-10 w-10 text-[var(--primary)] drop-shadow-lg" fill="var(--primary)" strokeWidth={1.5} />
                <div className="w-2 h-2 rounded-full bg-[var(--primary)]/40 mt-0.5" />
              </div>
            </div>
          )}

          {/* Category filter (non-pick mode) */}
          {!pickMode && (
            <div className="absolute top-4 left-0 right-0 z-[1000] px-4">
              <div className="max-w-lg mx-auto">
                <div className="glass glass-highlight rounded-2xl px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategoryFilter(cat.value)}
                      className={cn(
                        "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                        categoryFilter === cat.value
                          ? "bg-[var(--primary)] text-white shadow-[0_2px_8px_rgba(184,131,95,0.25)]"
                          : "text-foreground hover:bg-white/30 dark:hover:bg-white/10"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pick mode coordinates display */}
          {pickMode && (
            <div className="absolute top-4 left-0 right-0 z-[1000] px-4">
              <div className="max-w-sm mx-auto glass glass-highlight rounded-2xl px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground font-medium">Move the map to position the pin</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {pinLat.toFixed(4)}, {pinLng.toFixed(4)}
                </p>
              </div>
            </div>
          )}

          {/* Overlay buttons */}
          <div className="absolute bottom-8 left-0 right-0 z-[1000] flex items-center justify-center gap-4 px-6">
            {pickMode ? (
              <>
                <button
                  onClick={() => router.back()}
                  className="glass glass-highlight font-semibold py-3 px-6 rounded-full text-sm text-foreground transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePinLocation}
                  className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-semibold py-3 px-8 rounded-full shadow-[0_4px_20px_rgba(184,131,95,0.4)] transition-all duration-200"
                >
                  <MapPin className="h-5 w-5" />
                  Pin this location
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/create"
                  className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-semibold py-3 px-8 rounded-full shadow-[0_4px_20px_rgba(184,131,95,0.4)] transition-all duration-200"
                >
                  <Plus className="h-5 w-5" />
                  Report Issue
                </Link>
                <button
                  onClick={handleLocateMe}
                  className="w-12 h-12 glass rounded-full shadow-lg flex items-center justify-center transition-colors"
                >
                  <Crosshair className="h-5 w-5 text-foreground" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
