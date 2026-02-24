import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import Auth from '../Auth';
import { supabase } from '../supabase'; // Verifica que esta ruta sea correcta

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Escucha si el estado de la sesión cambia
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Si hay sesión, mándalo a la pantalla principal (tabs)
        router.replace('/(tabs)');
      }
    });
  }, []);

  return <Auth />;
}
