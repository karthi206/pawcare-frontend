import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Bell, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_URL } from "@/lib/config";
import { useAuth } from "@/hooks/use-auth";

// Same Leaflet icon fix used in CaseMap.tsx - required once per file that renders markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Ngo {
  id: number;
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
}

export default function NgoLocator() {
  const { toast } = useToast();
  const { user, token } = useAuth();
  const [, navigate] = useLocation();
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifiedIds, setNotifiedIds] = useState<Set<number>>(new Set());
  const [notifyingId, setNotifyingId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/ngos`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load NGOs");
        return res.json();
      })
      .then(setNgos)
      .catch(() => setError("Could not load NGOs. Is the backend running?"))
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleNotify = async (ngo: Ngo) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to notify an NGO.",
      });
      navigate("/login");
      return;
    }

    setNotifyingId(ngo.id);
    try {
      const response = await fetch(`${API_URL}/ngos/${ngo.id}/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error("Notify failed");

      setNotifiedIds((prev) => new Set(prev).add(ngo.id));
      toast({
        title: "NGO Notified",
        description: `${ngo.name} has been alerted about a case in their area.`,
      });
    } catch {
      toast({ title: "Failed to notify NGO", variant: "destructive" });
    } finally {
      setNotifyingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-primary mb-2">NGO Locator</h1>
        <p className="text-muted-foreground">Find and notify nearby animal welfare organizations.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <AlertCircle className="w-8 h-8" />
          <p>{error}</p>
        </div>
      ) : (
        <>
          <Card className="overflow-hidden border-2 shadow-lg">
            <div className="w-full min-h-[400px] h-[400px]">
              <MapContainer center={[13.03, 80.24]} zoom={11} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {ngos.map((ngo) => (
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
            {ngos.map((ngo) => (
              <Card key={ngo.id} className="hover-elevate border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-bold">{ngo.name}</CardTitle>
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
                    onClick={() => handleNotify(ngo)}
                    disabled={notifiedIds.has(ngo.id) || notifyingId === ngo.id}
                  >
                    {notifiedIds.has(ngo.id) ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Notified
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4" />
                        {notifyingId === ngo.id ? "Sending..." : "Notify NGO"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
