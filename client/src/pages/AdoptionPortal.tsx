import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, CheckCircle2, PawPrint, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";

interface Pet {
  id: number;
  name: string;
  breed: string | null;
  age: string | null;
  description: string | null;
  image_filename: string | null;
  is_vaccinated: boolean;
  status: string;
}

// Fallback image used only when a pet has no photo uploaded yet
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80";

export default function AdoptionPortal() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<number>>(new Set());
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  useEffect(() => {
    apiFetch("/pets")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load pets");
        return res.json();
      })
      .then(setPets)
      .catch(() => setError("Could not load pets. Is the backend running?"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleAdopt = async (pet: Pet) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to request an adoption.",
      });
      navigate("/login");
      return;
    }

    setRequestingId(pet.id);
    try {
      const response = await apiFetch(`/pets/${pet.id}/adopt`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        toast({ title: data.error || "Request failed", variant: "destructive" });
        return;
      }

      setRequestedIds((prev) => new Set(prev).add(pet.id));
      toast({
        title: "Adoption Request Sent",
        description: `Your interest in adopting ${pet.name} has been submitted. An NGO will contact you soon.`,
      });
    } catch {
      toast({ title: "Failed to submit request", variant: "destructive" });
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary">Find Your Forever Friend</h1>
        <p className="text-muted-foreground text-lg">Every animal here is rescued, treated, and waiting for a loving home.</p>
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
      ) : pets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No pets available for adoption right now. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pets.map((pet, idx) => (
            <motion.div
              key={pet.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                className="overflow-hidden border-border/50 hover-elevate group cursor-pointer"
                onClick={() => setSelectedPet(pet)}
              >
                <div className="aspect-[4/5] relative">
                  <img
                    src={pet.image_filename || PLACEHOLDER_IMAGE}
                    alt={pet.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {pet.is_vaccinated && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-emerald-500 text-white border-none flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Vaccinated
                      </Badge>
                    </div>
                  )}
                </div>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl font-bold">{pet.name}</CardTitle>
                    <div className="p-2 bg-primary/5 rounded-full text-primary">
                      <PawPrint className="w-5 h-5" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedPet} onOpenChange={(open) => !open && setSelectedPet(null)}>
        <DialogContent className="!max-w-3xl !w-[90vw] p-0 overflow-hidden">
          {selectedPet && (
            <div className="grid grid-cols-1 md:grid-cols-2">
              <img
                src={selectedPet.image_filename || PLACEHOLDER_IMAGE}
                alt={selectedPet.name}
                className="w-full h-full max-h-[75vh] object-cover"
              />
              <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">{selectedPet.name}</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                  {selectedPet.breed && <span className="bg-muted px-2 py-1 rounded">{selectedPet.breed}</span>}
                  {selectedPet.age && <span className="bg-muted px-2 py-1 rounded">{selectedPet.age}</span>}
                </div>
                {selectedPet.description && (
                  <p className="text-sm text-muted-foreground">{selectedPet.description}</p>
                )}
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 font-bold h-11 rounded-xl shadow-lg shadow-green-600/20 disabled:opacity-70 mt-auto"
                  onClick={() => handleAdopt(selectedPet)}
                  disabled={requestedIds.has(selectedPet.id) || requestingId === selectedPet.id}
                >
                  {requestedIds.has(selectedPet.id) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Request Sent
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 fill-current" />
                      {requestingId === selectedPet.id ? "Sending..." : "Adopt Me"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}