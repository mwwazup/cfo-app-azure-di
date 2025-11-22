import { useState, useEffect } from 'react';
import { UserProfile, useUser } from '@clerk/clerk-react';
import { upsertUserProfile } from '../config/supabaseClient';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export function AccountPage() {
  const { user } = useUser();

  const initialFirstName = user?.firstName ?? '';
  const initialLastName = user?.lastName ?? '';
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    '';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !email) return;

    const payload = {
      userId: user.id,
      email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      avatarUrl: user.imageUrl ?? null,
    };

    (async () => {
      try {
        await upsertUserProfile(payload);
      } catch (err) {
        console.error('Error syncing profile from Clerk to Supabase', err);
      }
    })();
  }, [user, email]);

  const handleSaveProfile = async () => {
    if (!user || !email) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await user.update({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      await upsertUserProfile({
        userId: user.id,
        email,
        firstName,
        lastName,
        avatarUrl: user.imageUrl,
      });

      setSuccess('Profile updated');
    } catch (err) {
      console.error('Error updating profile', err);
      setError('Unable to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Account Settings</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)] items-start">
        <div className="rounded-xl bg-card border border-border p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-muted overflow-hidden flex items-center justify-center text-lg font-semibold text-foreground">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.fullName ?? 'User avatar'}
                  className="h-full w-full object-cover"
                />
              ) : (
                (firstName?.[0] ?? email?.[0] ?? '?').toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Signed in as</p>
              <p className="text-sm text-muted">{email || 'Unknown email'}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
            <Input
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted">
              Avatar image is managed in account settings
            </div>
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving || !user}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-400 mt-2">{error}</p>
          )}
          {success && !error && (
            <p className="text-sm text-emerald-400 mt-2">{success}</p>
          )}
        </div>

        <div className="rounded-xl bg-card border border-border p-6 shadow-sm overflow-hidden">
          <UserProfile
            path="/account"
            routing="path"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-transparent border-0 shadow-none w-full p-0 max-h-[640px] overflow-y-auto',
                headerTitle: 'text-foreground',
                headerSubtitle: 'text-muted',
                profileSectionTitleText: 'text-foreground font-semibold',
                userPreviewMainIdentifier: 'text-foreground font-medium',
                userPreviewSecondaryIdentifier: 'text-muted',
                userButtonPopoverCard: 'bg-card border border-border',
                formButtonPrimary:
                  'bg-[#d5b274] hover:bg-[#c5a264] text-gray-900',
                formFieldLabel: 'text-muted',
                formFieldInput:
                  'bg-background border-border text-foreground focus:ring-2 focus:ring-[#d5b274]/60 focus:border-[#d5b274]',
                identityPreviewEditButton: 'text-[#d5b274]',
                accordionTriggerButton: 'text-foreground',
              },
              variables: {
                colorBackground: '#020617',
                colorText: '#e5e7eb',
                colorInputBackground: '#020617',
                colorPrimary: '#d5b274',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
