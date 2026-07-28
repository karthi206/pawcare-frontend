import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Stethoscope, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { API_URL as FLASK_API_URL } from "@/lib/config";

interface PendingVet {
  id: number;
  username: string;
  email: string;
  license_number: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
}

export default function AdminPanel() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [pendingVets, setPendingVets] = useState<PendingVet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchPendingVets();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchPendingVets = async () => {
    try {
      const response = await fetch(`${FLASK_API_URL}/admin/pending-vets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const response = await fetch(`${FLASK_API_URL}/admin/vets/${vetId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-primary mb-2">Vet Verification</h1>
      <p className="text-muted-foreground mb-8">Review and approve pending veterinarian applications.</p>

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
    </div>
  );
}
