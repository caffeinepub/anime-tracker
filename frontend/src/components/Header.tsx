import { Button } from '@/components/ui/button';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, List, Home, AlertCircle } from 'lucide-react';
import { useCheckLoginLockout, useGetRemainingLockoutTime, useResetLoginAttempts, useRecordFailedLoginAttempt } from '../hooks/useQueries';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SyncIndicator from './SyncIndicator';

interface HeaderProps {
  currentPage: 'main' | 'watchlists';
  onNavigate: (page: 'main' | 'watchlists') => void;
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { login, clear, loginStatus, identity, loginError } = useInternetIdentity();
  const queryClient = useQueryClient();
  
  const { data: isLockedOut = false } = useCheckLoginLockout();
  const { data: remainingLockoutTime = BigInt(0) } = useGetRemainingLockoutTime();
  const resetLoginAttempts = useResetLoginAttempts();
  const recordFailedAttempt = useRecordFailedLoginAttempt();
  
  const [lockoutMessage, setLockoutMessage] = useState<string>('');
  const [previousLoginStatus, setPreviousLoginStatus] = useState<string>(loginStatus);

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in' || isLockedOut;

  // Format remaining lockout time
  useEffect(() => {
    if (isLockedOut && remainingLockoutTime > BigInt(0)) {
      const remainingMs = Number(remainingLockoutTime) / 1_000_000;
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      setLockoutMessage(`Account locked. Try again in ${minutes}m ${seconds}s`);
    } else {
      setLockoutMessage('');
    }
  }, [isLockedOut, remainingLockoutTime]);

  // Track login status changes
  useEffect(() => {
    if (previousLoginStatus === 'logging-in' && loginStatus === 'loginError') {
      recordFailedAttempt.mutate();
    }
    
    if (loginStatus === 'success' && previousLoginStatus !== 'success') {
      resetLoginAttempts.mutate();
    }
    
    setPreviousLoginStatus(loginStatus);
  }, [loginStatus, previousLoginStatus, recordFailedAttempt, resetLoginAttempts]);

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
      onNavigate('main');
    } else {
      if (isLockedOut) {
        return;
      }
      
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Ani Body Count
            </h1>
            
            <nav className="flex gap-2">
              <Button
                variant={currentPage === 'main' ? 'default' : 'ghost'}
                onClick={() => onNavigate('main')}
                className="transition-all duration-200 hover:scale-105"
              >
                <Home className="w-4 h-4 mr-2" />
                Browse
              </Button>
              {isAuthenticated && (
                <Button
                  variant={currentPage === 'watchlists' ? 'default' : 'ghost'}
                  onClick={() => onNavigate('watchlists')}
                  className="transition-all duration-200 hover:scale-105"
                >
                  <List className="w-4 h-4 mr-2" />
                  My Lists
                </Button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated && <SyncIndicator />}
            
            <Button
              onClick={handleAuth}
              disabled={disabled}
              variant={isAuthenticated ? 'outline' : 'default'}
              className="transition-all duration-200 hover:scale-105"
            >
              {loginStatus === 'logging-in' ? (
                'Logging in...'
              ) : isAuthenticated ? (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </>
              )}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Lockout Alert */}
      {isLockedOut && lockoutMessage && (
        <div className="container mx-auto px-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {lockoutMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Login Error Alert */}
      {loginStatus === 'loginError' && !isLockedOut && loginError && (
        <div className="container mx-auto px-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {loginError.message}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}
