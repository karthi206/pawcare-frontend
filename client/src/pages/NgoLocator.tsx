import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Bell, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Same Leaflet icon fix used in CaseMap.tsx - required once per file that renders markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// NOTE: coordinates below are approximate for these areas of Chennai.
// Replace with each NGO's exact verified location before real-world use.
const MOCK_NGOS = [
  {
    id: 1,
    name: "Blue Cross of India",
    distance: "1.2 km away",
    phone: "+91 44 2235 4959",
    address: "72, Velachery Rd, Guindy, Chennai",
    lat: 13.0067,
    lng: 80.2206,
  },
  {
    id: 2,
    name: "PFA Chennai",
    distance: "3.5 km away",
    phone: "+91 44 2496 5555",
    address: "Besant Nagar, Chennai",
    lat: 13.0002,
    lng: 80.2669,
  },
  {
    id: 3,
    name: "Scan Foundation",
    distance: "5.8 km away",
    phone: "+91 94444 44444",
    address: "Kilpauk, Chennai",
    lat: 13.0827,
    lng: 80.2379,
  }
];

export default function NgoLocator() {
  const { toast } = useToast();
  const [notifiedIds, setNotifiedIds] = useState<Set<number>>(new Set());

  const handleNotify = (ngoName: string, ngoId: number) => {
    setNotifiedIds((prev) => new Set(prev).add(ngoId));
    toast({
      title: "NGO Notified",
      description: `${ngoName} has been alerted about a case in their area.`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-primary mb-2">NGO Locator</h1>
        <p className="text-muted-foreground">Find and notify nearby animal welfare organizations in Chennai.</p>
      </div>

      <Card className="overflow-hidden border-2 shadow-lg">
        <div className="w-full min-h-[400px] h-[400px]">
          <MapContainer center={[13.03, 80.24]} zoom={11} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {MOCK_NGOS.map((ngo) => (
              <Marker key={ngo.id} position={[ngo.lat, ngo.lng]}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{ngo.name}</p>
                    <p>{ngo.address}</p>
                    <p>{ngo.phone}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MOCK_NGOS.map((ngo) => (
          <Card key={ngo.id} className="hover-elevate border-border/50">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl font-bold">{ngo.name}</CardTitle>
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                  {ngo.distance}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{ngo.address}</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Phone className="w-4 h-4 text-primary" />
                  <a href={`tel:${ngo.phone.replace(/\s/g, '')}`} className="hover:text-primary hover:underline">
                    {ngo.phone}
                  </a>
                </div>
              </div>
              <Button 
                className="w-full bg-[#1F4E79] hover:bg-[#1F4E79]/90 text-white gap-2 font-semibold h-11 disabled:opacity-70"
                onClick={() => handleNotify(ngo.name, ngo.id)}
                disabled={notifiedIds.has(ngo.id)}
              >
                {notifiedIds.has(ngo.id) ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Notified
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Notify NGO
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}