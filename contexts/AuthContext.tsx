import Router from "next/router";
import { createContext, ReactNode, useEffect, useState } from "react";
import { api } from "../services/api";
import { setCookie, parseCookies, destroyCookie } from 'nookies'

type User = {
  email: string;
  permissions: string[];
  roles: string[];
};

type SignInCredentials = {
  email: string;
  password: string
}

type AuthContextData = {
  signIn(credentials: SignInCredentials): Promise<void>;
  user: User;
  isAuthenticated: boolean;
}

type AuthProviderProps = {
  children: ReactNode;
}

export const AuthContext = createContext({} as AuthContextData)

export function SignOut() {
  destroyCookie(undefined, 'nextauth.token')
  destroyCookie(undefined, 'nextauth.refreshToken')
  Router.push('/')
}


export function AuthProvider({ children }: AuthProviderProps) {

  useEffect(() => {
    const { 'nextauth.token': token } = parseCookies()

    if (token) {
      api.get('/me')
        .then(response => {
          const { email, roles, permissions } = response.data

          setUser({ email, permissions, roles })
        })
        .catch(() => {
          SignOut();
        })
    }
  }, [])

  const [user, setUser] = useState<User>()
  const isAuthenticated = !!user

  async function signIn({ email, password }: SignInCredentials) {
    try {
      const response = await api.post('sessions', {
        email,
        password
      })

      const { token, refreshToken, permissions, roles } = response.data

      setCookie(
        undefined,
        'nextauth.token',
        token,
        {
          maxAge: 60 * 60 * 24 * 30, // 30 days,
          path: '/'
        })
      setCookie(
        undefined,
        'nextauth.refreshToken',
        refreshToken,
        {
          maxAge: 60 * 60 * 24 * 30, // 30 days,
          path: '/'
        }
      )

      setUser({
        email,
        permissions,
        roles,
      })

      api.defaults.headers['Authorization'] = `Bearer ${token}`

      Router.push('/dashboard')

    } catch (err) {
      console.log(err)
    }
  }

  return (
    <AuthContext.Provider value={{
      signIn,
      user,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  )
}