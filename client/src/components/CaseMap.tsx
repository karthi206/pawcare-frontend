import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for a known Leaflet + bundler issue: default marker icon paths break
// because Leaflet expects images to be served in a way Vite doesn't do by default.
// We manually point it to icons hosted on a CDN instead.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CLUSTER_RADIUS_KM = 1.0; // must match backend's clustering.py value

interface Case {
  id: number;
  prediction: string;
  confidence: number;
  is_uncertain: boolean;
  status: string;
  location: string | null;
  created_at: string;
}

interface Cluster {
  disease: string;
  case_count: number;
  case_ids: number[];
  center_lat: number;
  center_lon: number;
  weighted_score?: number;
  vet_confirmed_count?: number;
  cluster_type?: "confirmed_outbreak" | "possible_cluster";
  title?: string;
  confidence_level?: "high" | "moderate" | "low";
}

interface CaseMapProps {
  cases: Case[];
  clusters: Cluster[];
}

// Confirmed outbreaks get red, while unconfirmed possible clusters get amber
function getClusterColor(cluster: Cluster): string {
  const isConfirmed = cluster.cluster_type === "confirmed_outbreak" || (cluster.vet_confirmed_count ?? 0) > 0;
  return isConfirmed ? "#dc2626" : "#f59e0b"; // Red vs Amber
}

// Parses "12.9716, 77.5946" into { lat, lon } - returns null if invalid/missing
function parseLocation(location: string | null): { lat: number; lon: number } | null {
  if (!location) return null;
  const parts = location.split(",").map((p) => parseFloat(p.trim()));
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  return { lat: parts[0], lon: parts[1] };
}

export default function CaseMap({ cases, clusters }: CaseMapProps) {
  const casesWithLocation = cases
    .map((c) => ({ ...c, coords: parseLocation(c.location) }))
    .filter((c) => c.coords !== null);

  if (casesWithLocation.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground bg-muted/20 rounded-2xl border">
        No cases with location data yet.
      </div>
    );
  }

  // Center the map on the first case with a location (simple default - not a true average/bounds-fit)
  const center: [number, number] = [
    casesWithLocation[0].coords!.lat,
    casesWithLocation[0].coords!.lon,
  ];

  return (
    <div className="h-96 rounded-2xl overflow-hidden border">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {clusters.map((cluster, idx) => {
          const isConfirmed = cluster.cluster_type === "confirmed_outbreak" || (cluster.vet_confirmed_count ?? 0) > 0;
          return (
            <Circle
              key={idx}
              center={[cluster.center_lat, cluster.center_lon]}
              radius={CLUSTER_RADIUS_KM * 1000} // Leaflet expects meters, our radius is in km
              pathOptions={{
                color: getClusterColor(cluster),
                fillColor: getClusterColor(cluster),
                fillOpacity: isConfirmed ? 0.25 : 0.15,
                dashArray: isConfirmed ? undefined : "6, 6",
              }}
            >
              <Popup>
                <div className="text-sm space-y-1.5 min-w-[200px]">
                  {isConfirmed ? (
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-red-600">🚨 Confirmed Outbreak</p>
                      <span className="text-[10px] bg-red-100 text-red-700 font-semibold px-1.5 py-0.5 rounded">Vet Verified</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-amber-600">⚠️ Possible Cluster</p>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded">AI Prediction</span>
                    </div>
                  )}
                  <p className="font-semibold text-foreground text-xs">{cluster.disease}</p>
                  <p className="text-xs text-muted-foreground">Cases in cluster: <span className="font-semibold text-foreground">{cluster.case_count}</span></p>
                  {cluster.vet_confirmed_count !== undefined && (
                    <p className="text-xs text-muted-foreground">Vet-confirmed: <span className="font-semibold text-green-700">{cluster.vet_confirmed_count}</span></p>
                  )}
                  {cluster.weighted_score !== undefined && (
                    <p className="text-xs text-muted-foreground">Evidence score: <span className="font-semibold text-foreground">{cluster.weighted_score}</span></p>
                  )}
                </div>
              </Popup>
            </Circle>
          );
        })}
        {casesWithLocation.map((c) => (
          <Marker key={c.id} position={[c.coords!.lat, c.coords!.lon]}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold">RC-{String(c.id).padStart(3, "0")}</p>
                <p>{c.prediction} {c.is_uncertain && "(Uncertain)"}</p>
                <p>Confidence: {Math.round(c.confidence * 100)}%</p>
                <p>Status: {c.status.replace("_", " ")}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}