
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/language-context';
import { Eye, EyeOff } from 'lucide-react';

interface LoginDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: 'login' | 'signup';
}

const content = {
    en: {
        loginTitle: "Log In to Your Account",
        loginDescription: "Enter your details to access the Opti-Freight platform.",
        emailLabel: "Email",
        passwordLabel: "Password",
        continueButton: "Continue",
        signupPrompt: "Don't have an account? Create one",
        signupTitle: "Create Your Account",
        signupDescription: "Join Opti-Freight and start investing in logistics today.",
        nameLabel: "Name",
        nicknameLabel: "Nickname",
        createAccountButton: "Create Account",
        loginPrompt: "Already have an account? Log In",
        missingFieldsToast: "Missing fields",
        enterEmailPasswordToast: "Please enter your email and password.",
        fillAllFieldsToast: "Please fill out all fields to create an account.",
        invalidEmailToast: "Please enter a valid email address.",
        loginSuccessToast: "Login Successful!",
        welcomeBackToast: (name: string) => `Welcome back, ${name}!`,
        accountCreatedToast: "Account Created!",
        welcomeToast: (name: string) => `Welcome to Opti-Freight, ${name}!`,
    },
    es: {
        loginTitle: "Inicia Sesión en Tu Cuenta",
        loginDescription: "Ingresa tus datos para acceder a la plataforma Opti-Freight.",
        emailLabel: "Correo",
        passwordLabel: "Contraseña",
        continueButton: "Continuar",
        signupPrompt: "¿No tienes una cuenta? Crea una",
        signupTitle: "Crea Tu Cuenta",
        signupDescription: "Únete a Opti-Freight y comienza a invertir en logística hoy.",
        nameLabel: "Nombre",
        nicknameLabel: "Apodo",
        createAccountButton: "Crear Cuenta",
        loginPrompt: "¿Ya tienes una cuenta? Inicia Sesión",
        missingFieldsToast: "Campos faltantes",
        enterEmailPasswordToast: "Por favor, ingresa tu correo y contraseña.",
        fillAllFieldsToast: "Por favor, completa todos los campos para crear una cuenta.",
        invalidEmailToast: "Por favor, ingresa un correo electrónico válido.",
        loginSuccessToast: "¡Inicio de Sesión Exitoso!",
        welcomeBackToast: (name: string) => `¡Bienvenido de nuevo, ${name}!`,
        accountCreatedToast: "¡Cuenta Creada!",
        welcomeToast: (name: string) => `¡Bienvenido a Opti-Freight, ${name}!`,
    }
}

export function LoginDialog({ isOpen, onOpenChange, initialMode = 'login' }: LoginDialogProps) {
  const [mode, setMode] = useState(initialMode);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupNickname, setSignupNickname] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const { login, signup } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { language } = useLanguage();
  const t = content[language];

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast({
        variant: "destructive",
        title: t.missingFieldsToast,
        description: t.enterEmailPasswordToast,
      });
      return;
    }

    if (!isValidEmail(loginEmail)) {
      toast({
        variant: "destructive",
        title: t.missingFieldsToast,
        description: t.invalidEmailToast,
      });
      return;
    }

    const success = login(loginEmail, loginPassword, () => {
      const name = loginEmail.split('@')[0];
      toast({
        title: t.loginSuccessToast,
        description: t.welcomeBackToast(name),
      });
      onOpenChange(false);
      // Small delay to ensure state updates before navigation
      setTimeout(() => {
        router.push('/app/portfolio');
      }, 100);
    });

    if (!success) {
      toast({
        variant: "destructive",
        title: "Invalid Credentials",
        description: language === 'es'
          ? "Email o contraseña incorrectos."
          : "Email or password is incorrect.",
      });
      return;
    }
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupNickname || !signupEmail || !signupPassword) {
      toast({
        variant: "destructive",
        title: t.missingFieldsToast,
        description: t.fillAllFieldsToast,
      });
      return;
    }

    if (!isValidEmail(signupEmail)) {
      toast({
        variant: "destructive",
        title: t.missingFieldsToast,
        description: t.invalidEmailToast,
      });
      return;
    }

    const success = signup(signupName, signupNickname, signupEmail, signupPassword, () => {
      toast({
        title: t.accountCreatedToast,
        description: t.welcomeToast(signupName),
      });
      onOpenChange(false);
      // Small delay to ensure state updates before navigation
      setTimeout(() => {
        router.push('/app/portfolio');
      }, 100);
    });

    if (!success) {
      toast({
        variant: "destructive",
        title: "Account Already Exists",
        description: language === 'es'
          ? "Ya existe una cuenta con este correo."
          : "An account with this email already exists.",
      });
      return;
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'signup' : 'login');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {mode === 'login' ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.loginTitle}</DialogTitle>
              <DialogDescription>
                {t.loginDescription}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLoginSubmit}>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email-login" className="text-right">
                    {t.emailLabel}
                    </Label>
                    <Input
                    id="email-login"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="col-span-3"
                    placeholder="john.doe@example.com"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password-login" className="text-right">
                    {t.passwordLabel}
                    </Label>
                    <div className="col-span-3 relative">
                      <Input
                      id="password-login"
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pr-10"
                      placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                </div>
                </div>
                <DialogFooter className='flex-col space-y-2'>
                    <Button type="submit" className="w-full">{t.continueButton}</Button>
                    <Button type="button" variant="link" size="sm" className="font-normal" onClick={toggleMode}>
                        {t.signupPrompt}
                    </Button>
                </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t.signupTitle}</DialogTitle>
              <DialogDescription>
                {t.signupDescription}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSignupSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name-signup" className="text-right">{t.nameLabel}</Label>
                      <Input id="name-signup" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="col-span-3" placeholder="John Doe" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="nickname-signup" className="text-right">{t.nicknameLabel}</Label>
                      <Input id="nickname-signup" value={signupNickname} onChange={(e) => setSignupNickname(e.target.value)} className="col-span-3" placeholder="Johnny" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email-signup" className="text-right">{t.emailLabel}</Label>
                      <Input id="email-signup" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="col-span-3" placeholder="john.doe@example.com" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password-signup" className="text-right">{t.passwordLabel}</Label>
                      <div className="col-span-3 relative">
                        <Input
                          id="password-signup"
                          type={showSignupPassword ? "text" : "password"}
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pr-10"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                  </div>
                </div>
                <DialogFooter className='flex-col space-y-2'>
                    <Button type="submit" className="w-full">{t.createAccountButton}</Button>
                    <Button type="button" variant="link" size="sm" className="font-normal" onClick={toggleMode}>
                        {t.loginPrompt}
                    </Button>
                </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
