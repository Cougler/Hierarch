import { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Mail, Lock } from 'lucide-react';

import { toast } from 'sonner';
import { supabase } from '@/app/supabase-client';
import { cn } from '@/app/lib/utils';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';

interface LoginProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
  onDemoLogin?: () => void;
}

export default function Login({ onLogin, onSwitchToSignup, onDemoLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back!');
      onLogin();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4">
      {/* Ambient background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <img src="/logo.svg" className="h-8 w-8" alt="Hierarch" />
            <h1 className="text-4xl font-bold tracking-tight text-white">Hierarch</h1>
          </div>
          <p className="text-sm text-gray-400">Build today, ship tomorrow.</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader className="pb-4">
              <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
              <p className="text-sm text-gray-400">Enter your credentials to continue</p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-gray-500 focus-visible:ring-teal-500"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-white/10 bg-white/5 pl-10 text-white placeholder:text-gray-500 focus-visible:ring-teal-500"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-white/20 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                />
                <Label htmlFor="remember" className="cursor-pointer text-sm text-gray-400">
                  Remember me
                </Label>
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-50"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {onDemoLogin && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDemoLogin}
                  className="w-full border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
                  size="lg"
                >
                  Try Demo — No Account Needed
                </Button>
              )}

              <p className="text-center text-sm text-gray-400">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToSignup}
                  className={cn(
                    'font-medium text-teal-400 underline-offset-4 transition-colors',
                    'hover:text-teal-300 hover:underline'
                  )}
                >
                  Create one
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
