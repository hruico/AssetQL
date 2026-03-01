'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthContextType } from '../types/auth';
import * as cognito from '../auth/cognito';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const session = await cognito.getSession();
      if (session) {
        const idToken = session.getIdToken();
        const payload = idToken.payload;
        
        setUser({
          id: payload.sub,
          email: payload.email,
          emailVerified: payload.email_verified,
          attributes: payload,
        });
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    await cognito.signIn(email, password);
    await checkUser();
  };

  const handleSignUp = async (email: string, password: string) => {
    await cognito.signUp(email, password);
  };

  const handleSignOut = async () => {
    await cognito.signOut();
    setUser(null);
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    await cognito.confirmSignUp(email, code);
  };

  const handleResendConfirmationCode = async (email: string) => {
    await cognito.resendConfirmationCode(email);
  };

  const handleForgotPassword = async (email: string) => {
    await cognito.forgotPassword(email);
  };

  const handleConfirmPassword = async (
    email: string,
    code: string,
    newPassword: string
  ) => {
    await cognito.confirmPassword(email, code, newPassword);
  };

  const handleGetIdToken = async (): Promise<string | null> => {
    return await cognito.getIdToken();
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    confirmSignUp: handleConfirmSignUp,
    resendConfirmationCode: handleResendConfirmationCode,
    forgotPassword: handleForgotPassword,
    confirmPassword: handleConfirmPassword,
    getIdToken: handleGetIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
