import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DashboardScreen() {
  const router = useRouter();

  // Definimos tus módulos principales
  const modulos = [
    { nombre: 'Nueva Orden', icon: '📋', ruta: '/nueva-orden', color: '#3498db' },
    { nombre: 'Inventario', icon: '📦', ruta: '/inventario', color: '#2ecc71' },
    { nombre: 'Clientes', icon: '👥', ruta: '/clientes', color: '#f1c40f' }, // <-- NUEVA OPCIÓN
    { nombre: 'Buscar Cliente', icon: '🔍', ruta: '/buscar', color: '#e67e22' },
    { nombre: 'Órdenes Activas', icon: '🛠️', ruta: '/activas', color: '#9b59b6' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>MiTallerApp 🛠️</Text>
        <Text style={styles.subtitle}>Panel de Administración</Text>
      </View>

      <View style={styles.grid}>
        {modulos.map((item) => (
          <TouchableOpacity 
            key={item.ruta}
            style={[styles.card, { borderLeftColor: item.color }]} 
            onPress={() => router.push(item.ruta as any)}
          >
            <View style={styles.cardHeader}>
               <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={styles.cardText}>{item.nombre}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Resumen del día</Text>
        <Text style={styles.infoText}>Tienes 0 órdenes pendientes hoy.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  header: { marginTop: 20, marginBottom: 30 },
  welcome: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: 16, color: '#6c757d' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 16, 
    marginBottom: 15, elevation: 3, borderLeftWidth: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4
  },
  cardHeader: { marginBottom: 10 },
  icon: { fontSize: 32 },
  cardText: { fontSize: 16, fontWeight: '700', color: '#343a40' },
  infoBox: { marginTop: 10, padding: 20, backgroundColor: '#e9ecef', borderRadius: 15 },
  infoTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  infoText: { color: '#495057' }
});
