import { useState } from 'react';
import { useBudget } from '@/lib/budget-context';
import { AVATAR_PRESETS } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function ProfilePage() {
  const { profile, updateProfile } = useBudget();
  const { toast } = useToast();
  const [username, setUsername] = useState(profile.username);
  const [email] = useState(profile.email);
  const [bio, setBio] = useState(profile.bio);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSaveProfile = async () => {
    await updateProfile({ username: username.trim(), bio: bio.trim() });
    toast({ title: 'Profile updated!' });
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'New password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated!' });
      setCurrentPassword('');
      setNewPassword('');
    }
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

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display">Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Current Password</Label><Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" /></div>
          <div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" /></div>
          <Button variant="outline" onClick={handleChangePassword} disabled={changingPassword}>
            {changingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
