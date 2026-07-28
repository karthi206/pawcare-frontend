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
}

interface CaseMapProps {
  cases: Case[];
  clusters: Cluster[];
}

// Contagious/serious conditions get a stronger warning color than milder ones
const SEVERE_DISEASES = ["ringworm", "Fungal_infections", "demodicosis"];

function getClusterColor(disease: string): string {
  return SEVERE_DISEASES.includes(disease) ? "#dc2626" : "#f59e0b"; // red vs amber
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
        {clusters.map((cluster, idx) => (
          <Circle
            key={idx}
            center={[cluster.center_lat, cluster.center_lon]}
            radius={CLUSTER_RADIUS_KM * 1000} // Leaflet expects meters, our radius is in km
            pathOptions={{
              color: getClusterColor(cluster.disease),
              fillColor: getClusterColor(cluster.disease),
              fillOpacity: 0.15,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-red-600">⚠ Possible {cluster.disease} outbreak</p>
                <p>{cluster.case_count} cases reported in this area</p>
              </div>
            </Popup>
          </Circle>
        ))}
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