import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Stethoscope, ShieldAlert, Loader2, PawPrint, Upload, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";

interface PendingVet {
  id: number;
  username: string;
  email: string;
  license_number: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingVets, setPendingVets] = useState<PendingVet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // ── Add Pet form state ──
  const [petName, setPetName] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petDescription, setPetDescription] = useState("");
  const [petVaccinated, setPetVaccinated] = useState(false);
  const [petImage, setPetImage] = useState<File | null>(null);
  const [petImagePreview, setPetImagePreview] = useState<string | null>(null);
  const [isSubmittingPet, setIsSubmittingPet] = useState(false);
  const [activeTab, setActiveTab] = useState<"vets" | "add-pet">("vets");

  useEffect(() => {
    if (user?.role === "admin") {
      fetchPendingVets();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchPendingVets = async () => {
    try {
      const response = await apiFetch("/admin/pending-vets");
      if (response.ok) {
        setPendingVets(await response.json());
      }
    } catch (err) {
      console.error("Failed to fetch pending vets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (vetId: number, username: string, action: "approve" | "reject") => {
    setProcessingId(vetId);
    try {
      const response = await apiFetch(`/admin/vets/${vetId}/${action}`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Action failed");

      setPendingVets((prev) => prev.filter((v) => v.id !== vetId));
      toast({
        title: action === "approve" ? "Vet Approved" : "Application Rejected",
        description: `${username} has been ${action === "approve" ? "verified and can now review cases" : "removed"}.`,
      });
    } catch (err) {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  // Block access entirely for non-admins
  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center">
        <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
        <p className="text-muted-foreground">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  const handlePetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPetImage(file);
    setPetImagePreview(URL.createObjectURL(file));
  };

  const resetPetForm = () => {
    setPetName("");
    setPetBreed("");
    setPetAge("");
    setPetDescription("");
    setPetVaccinated(false);
    setPetImage(null);
    setPetImagePreview(null);
  };

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setIsSubmittingPet(true);
    try {
      const formData = new FormData();
      formData.append("name", petName);
      formData.append("breed", petBreed);
      formData.append("age", petAge);
      formData.append("description", petDescription);
      formData.append("is_vaccinated", String(petVaccinated));
      if (petImage) formData.append("image", petImage);

      const response = await apiFetch("/pets", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to add pet");

      toast({
        title: "Pet Added",
        description: `${petName} is now listed in the Adoption Portal.`,
      });
      resetPetForm();
    } catch (err) {
      toast({ title: "Failed to add pet", variant: "destructive" });
    } finally {
      setIsSubmittingPet(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-primary mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">Manage vet verification and the adoption portal.</p>

      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("vets")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "vets"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          Vet Verification
        </button>
        <button
          onClick={() => setActiveTab("add-pet")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "add-pet"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PawPrint className="w-4 h-4" />
          Add Pet for Adoption
        </button>
      </div>

      {activeTab === "vets" && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingVets.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                No pending vet applications right now.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingVets.map((vet) => (
                <Card key={vet.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Stethoscope className="w-5 h-5 text-primary" />
                        {vet.username}
                      </CardTitle>
                      <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm"><span className="text-muted-foreground">Email:</span> {vet.email}</p>
                    <p className="text-sm"><span className="text-muted-foreground">License #:</span> {vet.license_number || "—"}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Clinic:</span> {vet.clinic_name || "—"}</p>
                    <p className="text-sm"><span className="text-muted-foreground">Address:</span> {vet.clinic_address || "—"}</p>

                    <div className="flex gap-3 pt-3">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                        disabled={processingId === vet.id}
                        onClick={() => handleDecision(vet.id, vet.username, "approve")}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
                        disabled={processingId === vet.id}
                        onClick={() => handleDecision(vet.id, vet.username, "reject")}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "add-pet" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-primary" />
                Add a Pet for Adoption
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPet} className="space-y-5">
                <div>
                  <Label htmlFor="pet-photo">Photo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {petImagePreview ? (
                      <img
                        src={petImagePreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-lg object-cover border border-border"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground">
                        <PawPrint className="w-8 h-8" />
                      </div>
                    )}
                    <label htmlFor="pet-photo" className="cursor-pointer">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input text-sm font-medium hover-elevate">
                        <Upload className="w-4 h-4" />
                        {petImage ? "Change Photo" : "Choose Photo"}
                      </div>
                      <input
                        id="pet-photo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePetImageChange}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Optional — a placeholder image is used if none is provided.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pet-name">Name *</Label>
                    <Input
                      id="pet-name"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="e.g. Buddy"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pet-breed">Breed</Label>
                    <Input
                      id="pet-breed"
                      value={petBreed}
                      onChange={(e) => setPetBreed(e.target.value)}
                      placeholder="e.g. Mixed"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="pet-age">Age</Label>
                  <Input
                    id="pet-age"
                    value={petAge}
                    onChange={(e) => setPetAge(e.target.value)}
                    placeholder="e.g. 2 years"
                  />
                </div>

                <div>
                  <Label htmlFor="pet-description">Description</Label>
                  <Textarea
                    id="pet-description"
                    value={petDescription}
                    onChange={(e) => setPetDescription(e.target.value)}
                    placeholder="Temperament, health notes, backstory..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="pet-vaccinated"
                    role="checkbox"
                    aria-checked={petVaccinated}
                    onClick={() => setPetVaccinated((prev) => !prev)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      petVaccinated ? "bg-primary border-primary" : "border-input"
                    }`}
                  >
                    {petVaccinated && <Check className="w-3 h-3 text-primary-foreground" />}
                  </button>
                  <Label htmlFor="pet-vaccinated" className="cursor-pointer" onClick={() => setPetVaccinated((prev) => !prev)}>
                    Vaccinated
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmittingPet}>
                  {isSubmittingPet ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Pet"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
      )}
    </div>
  );
}
