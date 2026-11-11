import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAuthRedirectOrigin, isPasswordValid, passwordsMatch, SIGNUP_SUCCESS_PATH } from '@/lib/auth-flow';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const register = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isPasswordValid(password)) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (!passwordsMatch(password, confirmation)) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${getAuthRedirectOrigin(window.location.origin)}/login` },
    });
    if (error) {
      setLoading(false);
      toast({ title: 'Could not create account', description: error.message, variant: 'destructive' });
      return;
    }

    if (data.session) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) {
        setLoading(false);
        toast({ title: 'Account created, but sign-out failed', description: 'Please sign out before continuing.', variant: 'destructive' });
        return;
      }
    }
    setLoading(false);
    navigate(SIGNUP_SUCCESS_PATH, {
      replace: true,
      state: { notice: 'Account created. Please sign in with your new password.' },
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
            <CardTitle className="font-display text-2xl">Create your account</CardTitle>
            <CardDescription>Sign up with your email and a password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void register(event)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input id="signup-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} className="pr-11" required />
                  <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirm password</Label>
                <div className="relative">
                  <Input id="signup-confirm-password" type={showConfirmation ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={6} className="pr-11" required />
                  <Button type="button" variant="ghost" size="icon" aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'} className="absolute right-1 top-1 h-8 w-8" onClick={() => setShowConfirmation((visible) => !visible)}>
                    {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}