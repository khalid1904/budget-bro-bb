import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const NAME_ASKED_FLAG = (userId: string) => `bb-name-asked-${userId}`;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast({ title: 'Unable to sign in', description: error.message, variant: 'destructive' });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    let needsName = false;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();
      needsName = !!profile && !profile.username && !localStorage.getItem(NAME_ASKED_FLAG(user.id));
      if (needsName) localStorage.setItem(NAME_ASKED_FLAG(user.id), '1');
    }
    if (needsName) setNameOpen(true);
    else navigate('/dashboard');
  };

  const sendResetLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      toast({ title: 'Enter your email address', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Could not send reset link', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Check your email',
      description: 'If an account exists for that address, a password reset link is on its way.',
    });
    setForgotPassword(false);
  };

  const finishName = async () => {
    const name = displayName.trim();
    if (name) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('profiles').update({ username: name }).eq('user_id', user.id);
    }
    setNameOpen(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/brand-hero.jpg" alt="Budget Bro" className="w-10 h-10 rounded-xl" />
          <span className="font-display font-bold text-2xl text-foreground">Budget Bro</span>
        </Link>
        <Card className="shadow-elevated">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">{forgotPassword ? 'Reset your password' : 'Welcome back'}</CardTitle>
            <CardDescription>
              {forgotPassword
                ? 'We’ll email you a link to choose a new password.'
                : 'Sign in to pick up where you left off.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {forgotPassword ? (
              <form onSubmit={(event) => void sendResetLink(event)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending link…' : 'Send reset link'}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setForgotPassword(false)}>
                  Back to sign in
                </Button>
              </form>
            ) : (
              <form onSubmit={(event) => void signIn(event)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button type="button" className="text-sm text-primary hover:underline" onClick={() => setForgotPassword(true)}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="pr-11" required />
                    <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowPassword((visible) => !visible)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  Don’t have an account? <Link to="/register" className="text-primary font-medium hover:underline">Sign up</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={nameOpen} onOpenChange={(open) => { if (!open) void finishName(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add a display name (optional)</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">You can skip this and set it later in Profile.</p>
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="e.g. Khalid" maxLength={30} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => void finishName()}>Skip</Button>
            <Button onClick={() => void finishName()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}