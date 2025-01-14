// eslint-disable-next-line react-hooks/exhaustive-deps
/* eslint-disable no-console */
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { Redirect } from '@reach/router';
import { navigate } from 'gatsby';
import { auth } from '../config/firebase';
import { avenueApi } from './api';

const provider = new GoogleAuthProvider();

const defaultValues = {
  authenticated: false,
  userData: {
    id: '',
  },
  token: '',
  login: () => {},
  logout: () => {},
};

export const AuthContext = createContext(defaultValues);

const AuthContextProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [userData, setUserData] = useState({});
  const [token, setToken] = useState('');

  // Setting user id on changing auth state
  useEffect(() => {
    onAuthStateChanged(auth, (users) => {
      if (users) {
        setAuthenticated(true);
        setUserData(users);
        setToken(users.accessToken);

        const fetchUser = async () => {
          try {
            const { data: avenueUser } = await avenueApi.get('/user', {
              params: { uid: users.uid },
              headers: { Authorization: `Bearer ${users.accessToken}` },
            });
            if (avenueUser) {
              setUserData((current) => ({ ...current, ...avenueUser }));
            }
          } catch (error) {
            console.error('unable to fetch user details', error);
          }
        };

        fetchUser();
      } else {
        setAuthenticated(false);
        setUserData({});
        setToken('');
        <Redirect to='/' />;
      }
    });
  }, []);

  const value = useMemo(() => {
    // login method
    const login = () => {
      signInWithPopup(auth, provider)
        .then((result) => {
          // This gives you a Google Access Token. You can use it to access the Google API.
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const { accessToken } = credential;
          // The signed-in user info.
          const { users } = result;
          // ...
          setAuthenticated(true);
          setToken(accessToken);
          setUserData(users);
          navigate('/register');
        })
        .catch((error) => {
          // Handle Errors here.
          const errorCode = error.code;
          const errorMessage = error.message;
          // The email of the user's account used.
          const { email } = error.customData;
          // The AuthCredential type that was used.
          const credential = GoogleAuthProvider.credentialFromError(error);
          // ...
          console.error(errorCode, errorMessage, email, credential);
        });
    };

    // logout method
    const logout = () => {
      auth.signOut();
      setAuthenticated(false);
      navigate('/');
    };

    return {
      user: authenticated,
      userData,
      token,
      login,
      logout,
      setUserData,
    };
  }, [authenticated, token, userData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContextProvider;
