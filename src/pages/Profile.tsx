import { useState } from 'react';
import { useBudget } from '@/lib/budget-context';
import { AVATAR_PRESETS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { profile, updateProfile } = useBudget();
  const { toast } = useToast();
  const [username, setUsername] = useState(profile.username);
  const [email] = useState(profile.email);
  const [bio, setBio] = useState(profile.bio);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const handleSaveProfile = async () => {
    await updateProfile({ username: username.trim(), bio: bio.trim() });
    toast({ title: 'Profile updated!' });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">Your personal info & security</p>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display">Avatar</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {AVATAR_PRESETS.map(a => (
              <button key={a} onClick={async () => {
                setSelectedAvatar(a);
                setSavingAvatar(true);
                await updateProfile({ avatar: a });
                setSavingAvatar(false);
                toast({ title: `Avatar updated to ${a}` });
              }}
                disabled={savingAvatar}
                className={`w-14 h-14 rounded-xl text-2xl flex items-center justify-center transition-all ${selectedAvatar === a ? 'bg-primary/10 ring-2 ring-primary scale-110' : 'bg-muted hover:bg-muted/80'}`}
              >{a}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Username</Label><Input value={username} onChange={e => setUsername(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} disabled className="opacity-60" /></div>
          <div className="space-y-2"><Label>Bio</Label><Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} /></div>
          <Button onClick={handleSaveProfile}>Save Changes</Button>
        </CardContent>
      </Card>

    </div>
  );
}
