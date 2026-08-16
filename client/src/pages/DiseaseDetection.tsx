import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, AlertCircle, CheckCircle2, Info, MapPin, WifiOff, RefreshCw, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api-client";

// Maps a raw model prediction label to display info.
// The Flask model only returns { prediction, confidence } - it doesn't know
// about severity or recommendations, so we handle that mapping here on the frontend.
const DISEASE_INFO: Record<string, { severity: "Low" | "Moderate" | "Critical"; recommendation: string }> = {
  Healthy: {
    severity: "Low",
    recommendation: "No signs of disease detected. Continue regular care and monitoring.",
  },
  Dermatitis: {
    severity: "Moderate",
    recommendation: "Signs of skin inflammation detected. Consult a veterinarian for proper diagnosis and treatment options.",
  },
  ringworm: {
    severity: "Critical",
    recommendation: "Possible fungal infection detected. This is contagious to other animals and humans - isolate the animal and seek veterinary attention promptly.",
  },
};

interface QueuedUpload {
  id: string;
  imageDataUrl: string;
  filename: string;
  location: string;
  queuedAt: string;
}

const QUEUE_STORAGE_KEY = "pawcare_offline_queue";

export default function DiseaseDetection() {
  const [, navigate] = useLocation(); // wouter's navigation function (ignoring path, we already use "location" for GPS)
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [location, setLocation] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "detecting" | "detected" | "denied">("idle");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedUploads, setQueuedUploads] = useState<QueuedUpload[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<{
    disease: string;
    confidence: number;
    severity: "Low" | "Moderate" | "Critical";
    recommendation: string;
    isAmbiguous: boolean;
    secondDisease: string | null;
    secondConfidence: number | null;
  } | null>(null);
  const { toast } = useToast();

  // Try to auto-detect location once, when the page first loads
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }

    setLocationStatus("detecting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setLocationStatus("detected");
      },
      () => {
        // User denied permission, or GPS unavailable - fall back to manual entry
        setLocationStatus("denied");
      }
    );
  }, []);

  // Load any previously queued (unsynced) uploads from localStorage on page load
  useEffect(() => {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      setQueuedUploads(JSON.parse(stored));
    }
  }, []);

  // Listen for the browser going online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      // Cleanup: remove listeners when this component unmounts, to avoid memory leaks
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Converts a File into a base64 string so it can be stored in localStorage (which only holds text)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Converts a stored base64 string back into a File, so it can be sent as FormData
  const base64ToFile = (dataUrl: string, filename: string): File => {
    const [header, base64Data] = dataUrl.split(",");
    const mimeMatch = header.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], filename, { type: mime });
  };

  // Attempts to upload all queued items - called automatically when connection returns
  const syncQueuedUploads = async () => {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    const queue: QueuedUpload[] = stored ? JSON.parse(stored) : [];
    if (queue.length === 0) return;

    setIsSyncing(true);
    const stillQueued: QueuedUpload[] = [];
    let successCount = 0;

    for (const item of queue) {
      try {
        const file = base64ToFile(item.imageDataUrl, item.filename);
        const formData = new FormData();
        formData.append("image", file);
        formData.append("location", item.location);

        // NOTE: /upload now requires login (@jwt_required() on the backend).
        // apiFetch sends the httpOnly auth cookie + CSRF header automatically.
        // If the person's session expired while they were offline, this will
        // come back 401 rather than succeeding silently — see the catch
        // block below, which now treats 401 the same as a permanent failure
        // rather than endlessly retrying a request that can never succeed
        // until they log back in.
        const response = await apiFetch("/upload", {
          method: "POST",
          body: formData,
        });

        if (response.status === 401) {
          toast({
            title: "Please log in to sync your offline uploads",
            description: "Your session expired while you were offline. Log back in and these will sync automatically.",
            variant: "destructive",
          });
          stillQueued.push(item); // keep it queued - retry once they're logged in again
          continue;
        }

        if (response.status === 422) {
          // Permanent rejection (e.g. not recognized as a dog) — retrying won't ever help,
          // so don't re-queue it. Tell the person clearly instead of silently failing forever.
          const data = await response.json().catch(() => null);
          toast({
            title: "One queued upload couldn't be processed",
            description: data?.message || "This photo wasn't recognized as a dog and won't be retried.",
            variant: "destructive",
          });
          continue; // don't push to stillQueued — drop it, and don't count it as a success
        }

        if (!response.ok) throw new Error("Sync failed for this item");
        successCount++; // Successfully synced - don't add it back to stillQueued
      } catch (err) {
        console.error("Failed to sync queued upload:", err);
        stillQueued.push(item); // genuine network/server failure - keep it queued, try again next time
      }
    }

    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(stillQueued));
    setQueuedUploads(stillQueued);
    setIsSyncing(false);

    if (successCount > 0) {
      toast({
        title: "Synced offline uploads",
        description: `${successCount} case(s) uploaded successfully.`,
      });
    }
  };

  // Automatically try syncing whenever we come back online
  useEffect(() => {
    if (isOnline && queuedUploads.length > 0) {
      syncQueuedUploads();
    }
  }, [isOnline]);

  const handleUpload = async () => {
    if (!imageFile) return;

    // If offline, save to the local queue instead of attempting a network request
    if (!isOnline) {
      const dataUrl = await fileToBase64(imageFile);
      const newItem: QueuedUpload = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        imageDataUrl: dataUrl,
        filename: imageFile.name,
        location,
        queuedAt: new Date().toISOString(),
      };

      const updatedQueue = [...queuedUploads, newItem];
      setQueuedUploads(updatedQueue);
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updatedQueue));

      toast({
        title: "Saved offline",
        description: "This case will upload automatically once you're back online.",
      });

      setImage(null);
      setImageFile(null);
      return;
    }

    setIsAnalyzing(true);

    // Build the multipart form data - same shape as the curl -F test you ran earlier
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("location", location);

    try {
      // /upload requires login now — apiFetch sends the httpOnly auth
      // cookie automatically (credentials: 'include'), so nothing else
      // needs to change here versus the old anonymous upload flow.
      const response = await apiFetch("/upload", {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to submit a case for analysis.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }

      // Special case: 422 means the backend rejected the image as "not a dog"
      if (response.status === 422) {
        const errorData = await response.json();
        toast({
          title: "Image not recognized as a dog",
          description: errorData.message || "Please upload a clear photo of a dog.",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      const info = DISEASE_INFO[data.prediction] ?? {
        severity: "Moderate" as const,
        recommendation: "Consult a veterinarian to confirm this result.",
      };

      setResult({
        disease: data.prediction,
        confidence: Math.round(data.confidence * 100),
        severity: data.is_uncertain ? "Moderate" : info.severity,
        recommendation: data.is_uncertain 
          ? "This result has low confidence. Please consult a veterinarian for an accurate diagnosis rather than relying on this AI prediction."
          : info.recommendation,
        isAmbiguous: data.is_ambiguous || false,
        secondDisease: data.second_prediction || null,
        secondConfidence: data.second_confidence ? Math.round(data.second_confidence * 100) : null,
      });

      toast({
        title: "Analysis Complete",
        description: "AI has identified a potential skin condition.",
      });
    } catch (error) {
      console.error("Prediction failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not reach the AI backend. Is your Flask server running?",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-primary mb-2">AI Disease Detection</h1>
        <p className="text-muted-foreground text-lg">
          Upload a clear photo of the affected area for instant preliminary analysis.
        </p>
      </div>

      {!isOnline && (
        <div className="mb-6 max-w-md mx-auto p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            You're offline. Uploads will be saved and synced automatically when you're back online.
          </p>
        </div>
      )}

      {queuedUploads.length > 0 && (
        <div className="mb-6 max-w-md mx-auto p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          {isSyncing ? (
            <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
          ) : (
            <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          )}
          <p className="text-sm text-blue-800 font-medium">
            {isSyncing
              ? "Syncing offline uploads..."
              : `${queuedUploads.length} case(s) waiting to sync.`}
          </p>
        </div>
      )}

      <div className="mb-6 max-w-md mx-auto">
        <label className="text-sm font-semibold flex items-center gap-1.5 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          Location
        </label>
        <Input
          placeholder={locationStatus === "detecting" ? "Detecting your location..." : "e.g. Chennai, T Nagar"}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="h-11 rounded-xl"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          {locationStatus === "detected" && "GPS location detected automatically — edit if needed."}
          {locationStatus === "denied" && "Couldn't access GPS — please enter the location manually."}
          {locationStatus === "detecting" && "Requesting location access..."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
          <CardContent 
            className="p-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <div className="aspect-square relative flex flex-col items-center justify-center p-6 text-center">
              {image ? (
                <>
                  <img 
                    src={image} 
                    alt="Preview" 
                    className="absolute inset-0 w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <Button variant="secondary" onClick={() => { setImage(null); setImageFile(null); }}>
                      Change Image
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Drag and drop image</p>
                    <p className="text-sm text-muted-foreground">or click to browse from your device</p>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        const reader = new FileReader();
                        reader.onload = () => setImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
          <div className="p-4 bg-muted/30 border-t">
            <Button 
              className="w-full h-12 text-base font-semibold" 
              disabled={!image || isAnalyzing}
              onClick={handleUpload}
            >
              {isAnalyzing ? "Analyzing with AI..." : "Analyze Image"}
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-2xl border border-border"
              >
                <div className="mb-4 p-4 bg-background rounded-full shadow-sm">
                  <Info className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ready for Analysis</h3>
                <p className="text-muted-foreground">
                  Upload an image of a stray animal's skin condition to see the AI diagnostic results here.
                </p>
                <div className="mt-8 w-full max-w-xs">
                  <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3 text-left">Sample Placeholder</p>
                  <img 
                    src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80" 
                    alt="Sample Dog" 
                    className="w-full h-40 object-cover rounded-xl grayscale opacity-50 border"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
                  <CardHeader className="bg-primary/5 pb-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-2xl">Detection Result</CardTitle>
                      <Badge 
                        variant={result.severity === "Critical" ? "destructive" : result.severity === "Moderate" ? "secondary" : "default"}
                        className="px-3 py-1 text-sm font-bold uppercase tracking-wider"
                      >
                        {result.severity} Severity
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-tight mb-1">Detected Condition</p>
                        <p className="text-xl font-bold text-foreground">{result.disease}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-tight mb-1">AI Confidence</p>
                        <p className="text-2xl font-black text-primary">{result.confidence}%</p>
                      </div>
                    </div>

                    {result.isAmbiguous && result.secondDisease && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                        <strong>Note:</strong> The AI wasn't fully confident between two conditions.
                        It could also be <strong>{result.secondDisease}</strong> ({result.secondConfidence}% likelihood).
                        A vet examination is recommended to distinguish between these.
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <h4>Professional Recommendation</h4>
                      </div>
                      <p className="text-muted-foreground leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/10 italic">
                        "{result.recommendation}"
                      </p>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setResult(null)}>
                        Clear Result
                      </Button>
                      <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => navigate("/ngo-locator")}>
                        Find Nearest NGO
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex gap-3">
                  <AlertCircle className="w-6 h-6 text-destructive shrink-0" />
                  <p className="text-sm text-destructive-foreground font-medium">
                    Disclaimer: This tool provides preliminary AI-based insights and is not a substitute for professional veterinary diagnosis.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}