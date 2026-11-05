import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MailCheck, ShieldCheck } from 'lucide-react';

const NAME_ASKED_FLAG = (userId: string) => `bb-name-asked-${userId}`;

export default function LoginPage() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const sendCode = async (resend = false) => {
    if (!email.trim()) {
      toast({ title: 'Please enter your email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }
    setStep('code');
    toast({
      title: resend ? 'Code sent again' : 'Check your email',
      description: 'We sent a 6-digit sign-in code to your email.',
    });
  };

  const verify = async () => {
    if (code.trim().length !== 6) {
      toast({ title: 'Enter the 6-digit code from your email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setLoading(false);
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
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
    if (needsName) {
      setNameOpen(true);
    } else {
      navigate('/dashboard');
    }
  };

  const finishName = async () => {
    const name = displayName.trim();
    if (name) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ username: name }).eq('user_id', user.id);
      }
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
            <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
            <CardDescription>
              {step === 'email'
                ? 'Sign in or create an account — no password needed'
                : `Enter the 6-digit code sent to ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <form
                onSubmit={(e) => { e.preventDefault(); void sendCode(); }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending code...' : 'Send Sign-in Code'}
                </Button>
              </form>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); void verify(); }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="code">6-digit code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em] font-display"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => { setStep('email'); setCode(''); }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Change email
                  </button>
                  <button
                    type="button"
                    className="text-primary font-medium hover:underline disabled:opacity-50"
                    disabled={loading}
                    onClick={() => void sendCode(true)}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
            {step === 'email' && (
              <p className="mt-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                New here? A code creates your account automatically.
              </p>
            )}
            {step === 'code' && (
              <p className="mt-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <MailCheck className="w-3.5 h-3.5" />
                Didn't get it? Check spam or resend.
              </p>
            )}
          </CardContent>
        </Card>

        <Dialog open={nameOpen} onOpenChange={(open) => { if (!open) void finishName(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add a display name (optional)</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground -mt-1">
              You can skip this and set it later in Profile.
            </p>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Khalid"
              maxLength={30}
            />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => void finishName()}>Skip</Button>
              <Button onClick={() => void finishName()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
