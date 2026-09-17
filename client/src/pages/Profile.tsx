import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User as UserIcon,
  Mail,
  Stethoscope,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Loader2,
  Building,
  MapPin,
  FileBadge,
  Save,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, safeParseJson } from "@/lib/api-client";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // ── Form 1: Profile Information state ──
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ── Form 2: Change Password state ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Synchronize initial state when user loads or updates
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setLicenseNumber(user.license_number || "");
      setClinicName(user.clinic_name || "");
      setClinicAddress(user.clinic_address || "");
    }
  }, [user]);

  if (!user) {
    return null;
  }

  // ── Profile Information Submit Handler ──
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    // Client-side validation
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedUsername) {
      setProfileError("Username cannot be empty.");
      return;
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 80) {
      setProfileError("Username must be between 3 and 80 characters.");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setProfileError("Please enter a valid email address.");
      return;
    }

    setIsUpdatingProfile(true);

    try {
      const payload: Record<string, string> = {
        username: trimmedUsername,
        email: trimmedEmail,
      };

      if (user.role === "vet") {
        payload.license_number = licenseNumber.trim();
        payload.clinic_name = clinicName.trim();
        payload.clinic_address = clinicAddress.trim();
      }

      const response = await apiFetch("/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeParseJson(response);

      if (!response.ok) {
        const errorMsg = data?.error || data?.message || "Failed to update profile.";
        setProfileError(errorMsg);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: errorMsg,
        });
        return;
      }

      // Success: refresh user across the entire app and alert user
      await refreshUser();
      toast({
        title: "Profile Updated",
        description: data?.message || "Your profile details have been saved successfully.",
      });
    } catch (err: any) {
      const fallbackMsg = err?.message || "An unexpected network error occurred.";
      setProfileError(fallbackMsg);
      toast({
        variant: "destructive",
        title: "Network Error",
        description: fallbackMsg,
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // ── Password Change Submit Handler ──
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const response = await apiFetch("/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await safeParseJson(response);

      if (!response.ok) {
        const errorMsg = data?.error || data?.message || "Failed to update password.";
        setPasswordError(errorMsg);
        toast({
          variant: "destructive",
          title: "Password Update Failed",
          description: errorMsg,
        });
        return;
      }

      // Clear fields and show toast
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password Updated",
        description: data?.message || "Your password has been changed successfully.",
      });
    } catch (err: any) {
      const fallbackMsg = err?.message || "An unexpected network error occurred.";
      setPasswordError(fallbackMsg);
      toast({
        variant: "destructive",
        title: "Network Error",
        description: fallbackMsg,
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
      {/* Page Header */}
      <header className="space-y-2 border-b border-border pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1F4E79] font-display">Account Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your personal profile details, clinical credentials, and security preferences.
            </p>
          </div>

          {/* Role & Verification Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {user.role === "admin" && (
              <Badge className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 px-3 py-1 text-xs">
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Badge>
            )}
            {user.role === "vet" && (
              <Badge className="bg-[#1F4E79] hover:bg-[#1F4E79]/90 text-white gap-1.5 px-3 py-1 text-xs">
                <Stethoscope className="w-3.5 h-3.5" />
                Veterinarian
              </Badge>
            )}
            {user.role === "user" && (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
                <UserIcon className="w-3.5 h-3.5" />
                User
              </Badge>
            )}

            {user.role === "vet" && (
              user.is_verified ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 gap-1.5 px-3 py-1 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-100 gap-1.5 px-3 py-1 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  Pending admin verification
                </Badge>
              )
            )}
          </div>
        </div>
      </header>

      {/* Vet Pending Notice */}
      {user.role === "vet" && !user.is_verified && (
        <aside
          role="alert"
          aria-live="polite"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Veterinarian Account Pending Approval</p>
            <p className="mt-0.5 text-amber-800">
              Your license details have been submitted for administrator review. You will be able to verify clinical diagnoses once an admin confirms your credentials.
            </p>
          </div>
        </aside>
      )}

      {/* ── Form 1: Profile Information ── */}
      <section aria-labelledby="profile-information-heading">
        <Card className="shadow-md border border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-[#1F4E79]/10 text-[#1F4E79] p-2 rounded-lg">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle id="profile-information-heading" className="text-xl font-bold text-[#1F4E79]">
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your display username, contact email, and clinical information.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handleProfileSubmit} noValidate>
            <CardContent className="space-y-4">
              {profileError && (
                <div
                  role="alert"
                  className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="profile-username" className="text-sm font-semibold">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      id="profile-username"
                      name="username"
                      type="text"
                      className="pl-9"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      aria-required="true"
                      autoComplete="username"
                      minLength={3}
                      maxLength={80}
                      placeholder="Your username"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="profile-email" className="text-sm font-semibold">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                    <Input
                      id="profile-email"
                      name="email"
                      type="email"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      aria-required="true"
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Account Role Read-Only Details */}
              <div className="space-y-2 pt-2">
                <Label className="text-sm font-semibold">Account Role</Label>
                <div className="p-3 bg-muted/40 rounded-lg text-sm text-foreground flex items-center justify-between border border-border">
                  <span className="capitalize font-medium text-muted-foreground">
                    {user.role === "vet" ? "Veterinarian" : user.role === "admin" ? "Administrator" : "Standard User"}
                  </span>
                  <span className="text-xs text-muted-foreground">Managed by system roles</span>
                </div>
              </div>

              {/* Vet Specific Fields */}
              {user.role === "vet" && (
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#1F4E79]">
                    Veterinary Clinic Credentials
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="profile-license" className="text-sm font-semibold">
                      Veterinary License Number
                    </Label>
                    <div className="relative">
                      <FileBadge className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                      <Input
                        id="profile-license"
                        name="license_number"
                        type="text"
                        className="pl-9"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. VET-98765-STATE"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-clinic-name" className="text-sm font-semibold">
                      Clinic Name
                    </Label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                      <Input
                        id="profile-clinic-name"
                        name="clinic_name"
                        type="text"
                        className="pl-9"
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="e.g. City Companion Animal Hospital"
                        autoComplete="organization"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-clinic-address" className="text-sm font-semibold">
                      Clinic Address
                    </Label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                      <Input
                        id="profile-clinic-address"
                        name="clinic_address"
                        type="text"
                        className="pl-9"
                        value={clinicAddress}
                        onChange={(e) => setClinicAddress(e.target.value)}
                        placeholder="e.g. 742 Evergreen Terrace, Springfield"
                        autoComplete="street-address"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-end pt-4 border-t border-border bg-muted/20">
              <Button
                type="submit"
                disabled={isUpdatingProfile}
                className="bg-[#1F4E79] hover:bg-[#1F4E79]/90 text-white font-semibold gap-2 shadow-xs"
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Profile Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </section>

      {/* ── Form 2: Change Password ── */}
      <section aria-labelledby="change-password-heading">
        <Card className="shadow-md border border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="bg-[#1F4E79]/10 text-[#1F4E79] p-2 rounded-lg">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <CardTitle id="change-password-heading" className="text-xl font-bold text-[#1F4E79]">
                  Change Password
                </CardTitle>
                <CardDescription>
                  Ensure your account is using a secure, strong password of at least 6 characters.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <form onSubmit={handlePasswordSubmit} noValidate>
            <CardContent className="space-y-4">
              {passwordError && (
                <div
                  role="alert"
                  className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-sm font-semibold">
                  Current Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="current-password"
                  name="current_password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  aria-required="true"
                  autoComplete="current-password"
                  placeholder="Enter your current password"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-semibold">
                    New Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="new-password"
                    name="new_password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    aria-required="true"
                    autoComplete="new-password"
                    minLength={6}
                    placeholder="At least 6 characters"
                  />
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-semibold">
                    Confirm New Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="confirm-password"
                    name="confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    aria-required="true"
                    autoComplete="new-password"
                    minLength={6}
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end pt-4 border-t border-border bg-muted/20">
              <Button
                type="submit"
                disabled={isUpdatingPassword}
                className="bg-[#1F4E79] hover:bg-[#1F4E79]/90 text-white font-semibold gap-2 shadow-xs"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </section>
    </div>
  );
}
