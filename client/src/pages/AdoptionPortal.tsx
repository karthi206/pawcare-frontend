import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, CheckCircle2, PawPrint } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const MOCK_PETS = [
  {
    id: 1,
    name: "Buddy",
    species: "Dog",
    age: "2 years",
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80"
  },
  {
    id: 2,
    name: "Luna",
    species: "Cat",
    age: "1 year",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&q=80"
  },
  {
    id: 3,
    name: "Max",
    species: "Dog",
    age: "4 years",
    image: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=500&q=80"
  },
  {
    id: 4,
    name: "Misty",
    species: "Cat",
    age: "3 months",
    image: "https://images.unsplash.com/photo-1573865662567-57ef5b67bfd7?w=500&q=80"
  }
];

export default function AdoptionPortal() {
  const { toast } = useToast();
  const [requestedIds, setRequestedIds] = useState<Set<number>>(new Set());

  const handleAdopt = (petName: string, petId: number) => {
    setRequestedIds((prev) => new Set(prev).add(petId));
    toast({
      title: "Adoption Request Sent",
      description: `Your interest in adopting ${petName} has been submitted. An NGO will contact you soon.`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary">Find Your Forever Friend</h1>
        <p className="text-muted-foreground text-lg">Every animal here is rescued, treated, and waiting for a loving home.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {MOCK_PETS.map((pet, idx) => (
          <motion.div
            key={pet.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="overflow-hidden border-border/50 hover-elevate group">
              <div className="aspect-[4/5] relative">
                <img 
                  src={pet.image} 
                  alt={pet.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-emerald-500 text-white border-none flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Vaccinated ✓
                  </Badge>
                </div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-bold">{pet.name}</CardTitle>
                  <div className="p-2 bg-primary/5 rounded-full text-primary">
                    <PawPrint className="w-5 h-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                  <span className="bg-muted px-2 py-1 rounded">{pet.species}</span>
                  <span className="bg-muted px-2 py-1 rounded">{pet.age}</span>
                </div>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 font-bold h-11 rounded-xl shadow-lg shadow-green-600/20 disabled:opacity-70"
                  onClick={() => handleAdopt(pet.name, pet.id)}
                  disabled={requestedIds.has(pet.id)}
                >
                  {requestedIds.has(pet.id) ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Request Sent
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 fill-current" />
                      Adopt Me
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}