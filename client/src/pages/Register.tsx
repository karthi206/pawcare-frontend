import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, User as UserIcon, Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Register() {
  const [, navigate] = useLocation();
  const { register } = useAuth();

  const [role, setRole] = useState<"user" | "vet">("user");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await register({
      username,
      email,
      password,
      role,
      ...(role === "vet" && {
        license_number: licenseNumber,
        clinic_name: clinicName,
        clinic_address: clinicAddress,
      }),
    });

    if (result.success) {
      setSuccessMessage(result.message || "Registered successfully");
      setTimeout(() => navigate("/login"), 2500);
    } else {
      setError(result.error || "Registration failed");
    }
    setIsSubmitting(false);
  };

  if (successMessage) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-xl border-2 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold">Account Created</h2>
            <p className="text-muted-foreground">{successMessage}</p>
            <p className="text-sm text-muted-foreground">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <p className="text-sm text-muted-foreground">Join PawCare AI</p>
        </CardHeader>
        <CardContent>
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole("user")}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                role === "user" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <UserIcon className={`w-6 h-6 ${role === "user" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Regular User</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("vet")}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                role === "vet" ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <Stethoscope className={`w-6 h-6 ${role === "vet" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Veterinarian</span>
            </button>
          </div>

          {role === "vet" && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              Vet accounts require admin verification before you can confirm diagnoses. You'll be notified once approved.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>

            {role === "vet" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="license">Veterinary License Number</Label>
                  <Input id="license" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic">Clinic Name</Label>
                  <Input id="clinic" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicAddress">Clinic Address</Label>
                  <Input id="clinicAddress" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} required />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
