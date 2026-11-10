import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isPasswordValid, isRecoveryLinkHash, passwordsMatch, updatePasswordThenSignOut } from '@/lib/auth-flow';

export default function ResetPasswordPage() {
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    const recoveryHash = isRecoveryLinkHash(window.location.hash);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setRecoveryReady(true);
        setCheckingLink(false);
      }
    });

    const checkLink = async () => {
      const query = new URLSearchParams(window.location.search);
      const code = query.get('code');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (error) {
          setCheckingLink(false);
          return;
        }
        window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);
        if (data.session) setRecoveryReady(true);
        setCheckingLink(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (recoveryHash && session) setRecoveryReady(true);
      setCheckingLink(false);
    };

    void checkLink();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isPasswordValid(password)) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (!passwordsMatch(password, confirmation)) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const error = await updatePasswordThenSignOut(
      () => supabase.auth.updateUser({ password }),
      () => supabase.auth.signOut({ scope: 'local' }),
    );
    setSaving(false);
    if (error) {
      toast({ title: 'Could not finish password reset', description: error.message, variant: 'destructive' });
      return;
    }
    navigate('/login', {
      replace: true,
      state: { notice: 'Password updated successfully. Please log in with your new password.' },
    });
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
            <CardTitle className="font-display text-2xl">Choose a new password</CardTitle>
            <CardDescription>
              {checkingLink ? 'Checking your reset link…' : recoveryReady ? 'Set a new password for your account.' : 'This reset link is invalid or expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recoveryReady ? (
              <form onSubmit={(event) => void savePassword(event)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Input id="new-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} className="pr-11" required />
                    <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowPassword((visible) => !visible)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">At least 6 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <div className="relative">
                    <Input id="confirm-password" type={showConfirmation ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={6} className="pr-11" required />
                    <Button type="button" variant="ghost" size="icon" aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'} className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowConfirmation((visible) => !visible)}>
                      {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? 'Updating password…' : 'Save new password'}
                </Button>
              </form>
            ) : !checkingLink ? (
              <Button asChild variant="outline" className="w-full"><Link to="/login">Return to sign in</Link></Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}