import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, Loader2, Table as TableIcon, Map as MapIcon, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CaseMap from "@/components/CaseMap";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { API_URL as FLASK_API_URL } from "@/lib/config";

const DISEASE_OPTIONS = ["Dermatitis", "Fungal_infections", "Healthy", "Hypersensitivity", "demodicosis", "ringworm"];

// Shape of a case as returned by Flask's /cases endpoint (matches models.py's to_dict())
interface Case {
  id: number;
  filename: string;
  prediction: string;
  confidence: number;
  is_uncertain: boolean;
  status: string;
  location: string | null;
  created_at: string;
  vet_confirmed_label: string | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "bg-gray-100 text-gray-600 border-gray-200";
    case "vet_confirmed": return "bg-blue-100 text-blue-600 border-blue-200";
    case "resolved": return "bg-green-100 text-green-600 border-green-200";
    default: return "bg-gray-100 text-gray-600";
  }
};

const formatStatus = (status: string) => {
  return status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

interface Cluster {
  disease: string;
  case_count: number;
  case_ids: number[];
  center_lat: number;
  center_lon: number;
}

export default function CaseTracker() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "map">("table");

  const isVerifiedVet = user?.role === "vet" && user?.is_verified;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [casesRes, clustersRes] = await Promise.all([
          fetch(`${FLASK_API_URL}/cases`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${FLASK_API_URL}/clusters`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!casesRes.ok) throw new Error(`Server responded with ${casesRes.status}`);

        const casesData = await casesRes.json();
        setCases(casesData);

        if (clustersRes.ok) {
          const clustersData = await clustersRes.json();
          setClusters(clustersData);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Could not load cases. Is your Flask server running?");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const filteredCases = cases.filter(c => 
    String(c.id).includes(searchTerm.toLowerCase()) ||
    c.prediction.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Called when a vet selects the correct disease for a case
  const handleVetReview = async (caseId: number, correctedLabel: string) => {
    try {
      const response = await fetch(`${FLASK_API_URL}/cases/${caseId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          status: "vet_confirmed",
          vet_confirmed_label: correctedLabel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Could not save review",
          description: errorData.error || "Something went wrong.",
          variant: "destructive",
        });
        return;
      }

      const updatedCase = await response.json();
      setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));
      toast({ title: "Review saved", description: "Diagnosis confirmed successfully." });
    } catch (err) {
      console.error("Failed to submit vet review:", err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Rescue Case Tracker</h1>
          <p className="text-muted-foreground">Monitor real-time rescue and recovery operations.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID, disease or status..." 
              className="pl-10 h-11 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0"
            onClick={() => setViewMode("map")}
          >
            <MapIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {clusters.length > 0 && (
        <div className="space-y-2">
          {clusters.map((cluster, idx) => (
            <div
              key={idx}
              className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
            >
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-red-800 font-medium">
                Possible <strong>{cluster.disease}</strong> outbreak — {cluster.case_count} cases
                reported in a concentrated area ({cluster.center_lat.toFixed(3)}, {cluster.center_lon.toFixed(3)})
              </p>
            </div>
          ))}
        </div>
      )}

      {viewMode === "map" ? (
        <CaseMap cases={filteredCases} clusters={clusters} />
      ) : (
      <Card className="border-none shadow-xl shadow-black/5 overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold py-4">Case ID</TableHead>
                <TableHead className="font-bold">Detected Condition</TableHead>
                <TableHead className="font-bold">AI Confidence</TableHead>
                <TableHead className="font-bold">Location</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Vet Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin opacity-40" />
                      <p>Loading cases...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-destructive">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 opacity-60" />
                      <p>{error}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 opacity-20" />
                      <p>No rescue cases found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCases.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium py-4">RC-{String(c.id).padStart(3, "0")}</TableCell>
                    <TableCell>
                      {c.prediction}
                      {c.is_uncertain && (
                        <span className="ml-2 text-xs text-amber-600 font-semibold">(Uncertain)</span>
                      )}
                    </TableCell>
                    <TableCell>{Math.round(c.confidence * 100)}%</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.location || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-semibold px-3 py-1 ${getStatusColor(c.status)}`}>
                        {formatStatus(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {c.vet_confirmed_label ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Stethoscope className="w-3.5 h-3.5 text-green-600" />
                          <span className={c.vet_confirmed_label === c.prediction ? "text-green-700" : "text-orange-700 font-medium"}>
                            {c.vet_confirmed_label}
                          </span>
                        </div>
                      ) : isVerifiedVet ? (
                        <Select onValueChange={(value) => handleVetReview(c.id, value)}>
                          <SelectTrigger className="h-9 w-[160px] text-xs">
                            <SelectValue placeholder="Confirm diagnosis" />
                          </SelectTrigger>
                          <SelectContent>
                            {DISEASE_OPTIONS.map((disease) => (
                              <SelectItem key={disease} value={disease}>
                                {disease}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          {user ? "Vet review only" : "Log in as a vet to review"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}
    </div>
  );
}