import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Auth from '../Auth';
import { supabase } from '../supabase';

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verificamos si ya hay una sesión activa al arrancar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchamos cambios (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  // SI NO HAY SESIÓN: Mostramos la pantalla de Login que creamos
  if (!session) {
    return <Auth />;
  }

  // SI HAY SESIÓN: Mostramos el contenido de la carpeta (tabs)
  return <Stack screenOptions={{ headerShown: false }} />;
}
