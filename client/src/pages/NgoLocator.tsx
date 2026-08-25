import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Phone,
  Bell,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Navigation,
  Info,
  ExternalLink,
  Stethoscope,
  Building2,
  Compass,
  ShieldCheck,
  Plus,
  X,
  Crosshair,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

// Same Leaflet icon fix used in CaseMap.tsx - required once per file that renders markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapClickHandler({ onLocationSelect, enabled }: { onLocationSelect: (lat: number, lng: number) => void; enabled: boolean }) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

interface Ngo {
  id: number | string;
  name: string;
  phone?: string | null;
  address: string;
  lat: number;
  lng: number;
  distance_km?: number;
  type?: string;
  source?: "registered" | "osm";
}

export default function NgoLocator() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [registeredNgos, setRegisteredNgos] = useState<Ngo[]>([]);
  const [liveNgos, setLiveNgos] = useState<Ngo[]>([]);
  const [activeTab, setActiveTab] = useState<"registered" | "live">("registered");

  const [isLoading, setIsLoading] = useState(true);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [notifiedIds, setNotifiedIds] = useState<Set<number | string>>(new Set());
  const [notifyingId, setNotifyingId] = useState<number | string | null>(null);

  // ── Admin Add NGO state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [ngoName, setNgoName] = useState("");
  const [ngoPhone, setNgoPhone] = useState("");
  const [ngoAddress, setNgoAddress] = useState("");
  const [ngoLat, setNgoLat] = useState("");
  const [ngoLng, setNgoLng] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRegisteredNgos = async (coords?: { lat: number; lng: number }) => {
    const c = coords || userCoords;
    if (c) {
      try {
        const res = await apiFetch(`/ngos/nearby?lat=${c.lat}&lng=${c.lng}&radius_km=50`);
        if (res.ok) {
          const data = await res.json();
          setRegisteredNgos(data.map((n: Ngo) => ({ ...n, source: "registered" })));
          return;
        }
      } catch {
        // fallback below
      }
    }
    try {
      const res = await apiFetch("/ngos");
      if (res.ok) {
        const data = await res.json();
        setRegisteredNgos(data.map((n: Ngo) => ({ ...n, source: "registered" })));
      }
    } catch {
      setError("Could not load NGOs. Is the backend running?");
    }
  };

  const fetchFallbackNgos = (noticeMsg?: string) => {
    if (noticeMsg) setLocationNotice(noticeMsg);
    apiFetch("/ngos")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load NGOs");
        return res.json();
      })
      .then((data: Ngo[]) => {
        setRegisteredNgos(data.map((n) => ({ ...n, source: "registered" })));
      })
      .catch(() => setError("Could not load NGOs. Is the backend running?"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserCoords({ lat, lng });

          // 1. Fetch nearby registered NGOs
          try {
            const res = await apiFetch(`/ngos/nearby?lat=${lat}&lng=${lng}&radius_km=50`);
            if (res.ok) {
              const data = await res.json();
              setRegisteredNgos(data.map((n: Ngo) => ({ ...n, source: "registered" })));
              setLocationNotice(null);
            } else {
              fetchFallbackNgos("Showing registered NGOs. Could not compute nearby distances.");
            }
          } catch {
            fetchFallbackNgos("Showing registered NGOs. Could not compute nearby distances.");
          } finally {
            setIsLoading(false);
          }

          // 2. Fetch live nearby discoveries from OpenStreetMap in background
          setIsLiveLoading(true);
          try {
            const liveRes = await apiFetch(`/api/ngos/live-nearby?lat=${lat}&lng=${lng}&radius_km=50`);
            if (liveRes.ok) {
              const liveData = await liveRes.json();
              setLiveNgos(liveData);
            }
          } catch {
            // Non-critical fallback
          } finally {
            setIsLiveLoading(false);
          }
        },
        () => {
          // Geolocation permission denied or unavailable
          fetchFallbackNgos("Enable location in your browser to automatically see nearby NGOs and live shelters sorted by distance.");
        },
        { timeout: 8000, enableHighAccuracy: false }
      );
    } else {
      fetchFallbackNgos("Geolocation is not supported by your browser. Showing all registered NGOs.");
    }
  }, []);

  const handleLocationPick = (lat: number, lng: number) => {
    setNgoLat(lat.toFixed(6));
    setNgoLng(lng.toFixed(6));
    setFormError(null);
  };

  const handleCreateNgo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = ngoName.trim();
    const phone = ngoPhone.trim();
    const address = ngoAddress.trim();
    const lat = parseFloat(ngoLat);
    const lng = parseFloat(ngoLng);

    if (!name) {
      setFormError("NGO name is required.");
      return;
    }
    if (!phone) {
      setFormError("Phone number is required.");
      return;
    }
    if (!address) {
      setFormError("Address is required.");
      return;
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFormError("Latitude must be a valid number between -90 and 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setFormError("Longitude must be a valid number between -180 and 180.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch("/ngos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          address,
          lat,
          lng,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create partner NGO");
      }

      toast({
        title: "Partner NGO Registered",
        description: `${name} has been added to the Verified Partners list.`,
      });

      // Reset form
      setNgoName("");
      setNgoPhone("");
      setNgoAddress("");
      setNgoLat("");
      setNgoLng("");
      setShowAddForm(false);
      setActiveTab("registered");

      // Refresh list
      loadRegisteredNgos();
    } catch (err: any) {
      setFormError(err.message || "Failed to create partner NGO.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      const response = await apiFetch(`/ngos/${ngo.id}/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: `Alert for injured/sick animal reported near ${ngo.name}` }),
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

  const currentList = activeTab === "registered" ? registeredNgos : liveNgos;
  const mapCenter: [number, number] = userCoords ? [userCoords.lat, userCoords.lng] : [13.03, 80.24];

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case "veterinary":
        return (
          <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 font-medium">
            <Stethoscope className="w-3 h-3 text-emerald-600" aria-hidden="true" />
            Vet Clinic
          </Badge>
        );
      case "animal_shelter":
        return (
          <Badge variant="outline" className="gap-1 border-blue-300 bg-blue-50 text-blue-700 font-medium">
            <Building2 className="w-3 h-3 text-blue-600" aria-hidden="true" />
            Animal Shelter
          </Badge>
        );
      case "ngo":
      default:
        return (
          <Badge variant="outline" className="gap-1 border-purple-300 bg-purple-50 text-purple-700 font-medium">
            <Building2 className="w-3 h-3 text-purple-600" aria-hidden="true" />
            NGO / Rescue
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">NGO & Shelter Locator</h1>
          <p className="text-muted-foreground">Find and alert animal welfare organizations, shelters, and vet clinics near you.</p>
        </div>

        {/* Controls & Admin Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit border border-border">
            <Button
              type="button"
              variant={activeTab === "registered" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("registered")}
              className="gap-2 font-medium h-9"
            >
              <ShieldCheck className="w-4 h-4" />
              Verified Partners ({registeredNgos.length})
            </Button>
            <Button
              type="button"
              variant={activeTab === "live" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("live")}
              className="gap-2 font-medium h-9"
            >
              <Compass className="w-4 h-4" />
              Live Discoveries ({isLiveLoading ? "..." : liveNgos.length})
            </Button>
          </div>

          {user?.role === "admin" && (
            <Button
              type="button"
              variant={showAddForm ? "outline" : "default"}
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-9"
            >
              {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddForm ? "Close Form" : "Add Partner NGO"}
            </Button>
          )}
        </div>
      </div>

      {showAddForm && user?.role === "admin" && (
        <Card className="border-2 border-emerald-500/40 bg-emerald-50/10 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Register New Verified Partner NGO
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Click anywhere on the map to pick coordinates, or type them manually.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateNgo} className="space-y-4">
              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm flex items-center gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ngo-name">NGO / Organization Name *</Label>
                  <Input
                    id="ngo-name"
                    placeholder="e.g. People For Animals Chennai"
                    value={ngoName}
                    onChange={(e) => setNgoName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ngo-phone">Contact Phone Number *</Label>
                  <Input
                    id="ngo-phone"
                    placeholder="e.g. +91 98400 12345"
                    value={ngoPhone}
                    onChange={(e) => setNgoPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ngo-address">Physical Address *</Label>
                <Input
                  id="ngo-address"
                  placeholder="e.g. 11/2 Besant Avenue, Adyar, Chennai 600020"
                  value={ngoAddress}
                  onChange={(e) => setNgoAddress(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ngo-lat" className="flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5 text-primary" /> Latitude *
                  </Label>
                  <Input
                    id="ngo-lat"
                    type="number"
                    step="any"
                    placeholder="e.g. 13.082700"
                    value={ngoLat}
                    onChange={(e) => setNgoLat(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ngo-lng" className="flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5 text-primary" /> Longitude *
                  </Label>
                  <Input
                    id="ngo-lng"
                    type="number"
                    step="any"
                    placeholder="e.g. 80.270700"
                    value={ngoLng}
                    onChange={(e) => setNgoLng(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Partner NGO
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {locationNotice && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/60 border border-border text-sm text-muted-foreground" role="status">
          <Info className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          <span>{locationNotice}</span>
        </div>
      )}

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
              <MapContainer center={mapCenter} zoom={11} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapClickHandler onLocationSelect={handleLocationPick} enabled={showAddForm} />
                {ngoLat && ngoLng && !isNaN(parseFloat(ngoLat)) && !isNaN(parseFloat(ngoLng)) && (
                  <Marker position={[parseFloat(ngoLat), parseFloat(ngoLng)]}>
                    <Popup>
                      <div className="text-xs font-semibold text-emerald-700">
                        Selected New NGO Location ({parseFloat(ngoLat).toFixed(4)}, {parseFloat(ngoLng).toFixed(4)})
                      </div>
                    </Popup>
                  </Marker>
                )}
                {currentList.map((ngo) => (
                  <Marker key={String(ngo.id)} position={[ngo.lat, ngo.lng]}>
                    <Popup>
                      <div className="text-sm space-y-1">
                        <p className="font-bold">{ngo.name}</p>
                        {ngo.type && getTypeBadge(ngo.type)}
                        {ngo.distance_km !== undefined && (
                          <p className="text-xs text-primary font-semibold">{ngo.distance_km} km away</p>
                        )}
                        <p className="text-muted-foreground text-xs">{ngo.address}</p>
                        {ngo.phone && <p className="text-xs font-medium">{ngo.phone}</p>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>

          {activeTab === "live" && isLiveLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Querying OpenStreetMap for live animal shelters and clinics within 50 km...</p>
            </div>
          ) : currentList.length === 0 ? (
            <div className="text-center py-12 p-8 border rounded-lg bg-card shadow-sm space-y-3">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">No locations found nearby</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {activeTab === "live"
                  ? "No listed animal shelters or clinics were found within 50 km on OpenStreetMap. Try switching to Verified Partners."
                  : "No registered NGOs are listed in this area yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentList.map((ngo) => (
                <Card key={String(ngo.id)} className="hover-elevate border-border/50 flex flex-col justify-between">
                  <div>
                    <CardHeader className="pb-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-xl font-bold line-clamp-2">{ngo.name}</CardTitle>
                        {ngo.distance_km !== undefined && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 shrink-0 gap-1 font-semibold text-xs py-1">
                            <Navigation className="w-3 h-3" aria-hidden="true" />
                            {ngo.distance_km} km
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {ngo.source === "registered" ? (
                          <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary text-xs">
                            <ShieldCheck className="w-3 h-3" />
                            Verified Partner
                          </Badge>
                        ) : (
                          getTypeBadge(ngo.type)
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{ngo.address}</span>
                        </div>
                        {ngo.phone && (
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <Phone className="w-4 h-4 text-primary shrink-0" />
                            <a href={`tel:${ngo.phone.replace(/\s/g, '')}`} className="hover:text-primary hover:underline">
                              {ngo.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-6 pt-0">
                    {ngo.source === "registered" ? (
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
                    ) : (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${ngo.lat},${ngo.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full"
                      >
                        <Button
                          variant="outline"
                          className="w-full gap-2 font-semibold h-11 hover:bg-primary/5 hover:text-primary hover:border-primary/40"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Get Directions
                        </Button>
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
