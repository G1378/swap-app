"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import type { Profile } from "@/types";

interface EditProfileDialogProps {
  profile: Profile | null;
  userId: string;
  fallbackUsername: string;
}

export function EditProfileDialog({ profile, userId, fallbackUsername }: EditProfileDialogProps) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(profile?.username ?? fallbackUsername);
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatarUrl ?? null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile) return profile?.avatarUrl ?? null;

    const ext = avatarFile.name.split(".").pop();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { cacheControl: "3600", upsert: false });

    if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const avatarUrl = await uploadAvatar();

      const payload = {
        username: username.trim(),
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        avatar_url: avatarUrl,
      };

      // Upsert rather than update: a profiles row is created by the
      // handle_new_user trigger on signup, but this stays safe even if
      // that row is somehow missing when the dialog is first used.
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({ id: userId, ...payload }, { onConflict: "id" });

      if (upsertError) throw new Error(upsertError.message);

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Edit profile
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Edit profile"
        description="This is how other swappers will see you."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar alt={username} fallback={username} src={avatarPreview} size={64} />
            <label
              htmlFor="avatar"
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <ImagePlus className="h-4 w-4" /> Change photo
            </label>
            <input id="avatar" type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              required
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
              title="Letters, numbers, and underscores only"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              maxLength={80}
              placeholder="e.g. Austin, TX"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              maxLength={280}
              placeholder="Tell other swappers a bit about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
