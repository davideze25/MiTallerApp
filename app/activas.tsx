import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../supabase';

export default function OrdenesActivasScreen() {
  const [ordenes, setOrdenes] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true); 
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<any>(null); 
  
  // --- NUEVOS ESTADOS PARA DIAGNÓSTICO Y COSTO ---
  const [diagnosticoInput, setDiagnosticoInput] = useState('');
  const [costoInput, setCostoInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    fetchOrdenes(); 
  }, []); 

  async function fetchOrdenes() {
    setLoading(true); 
    const { data, error } = await supabase 
      .from('ordenes') 
      .select(` 
        *, 
        equipos ( 
          identificador, 
          marca, 
          clientes ( 
            nombre, 
            telefono 
          ) 
        ) 
      `) 
      .neq('estatus', 'Entregada') // Filtramos las entregadas
      .order('created_at', { ascending: false }); 

    if (error) { 
      console.error("Error detallado:", error.message);
    } else { 
      setOrdenes(data || []);
    } 
    setLoading(false); 
  } 
  
  // ... después de fetchOrdenes() ...

  const enviarARevision = async () => {
    if (!diagnosticoInput || !costoInput) {
      return Alert.alert("Faltan datos", "Por favor ingresa el diagnóstico y el costo estimado.");
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('ordenes')
      .update({
        diagnostico: diagnosticoInput,
        costo_total: parseFloat(costoInput), // Tu columna float8
        estatus: 'En Revisión' // Cambio de estatus clave
      })
      .eq('id', ordenSeleccionada.id);

    setIsSaving(false);

    if (error) {
      Alert.alert("Error", "No se pudo actualizar: " + error.message);
    } else {
      // Al guardar con éxito, disparamos el WhatsApp
      enviarWhatsAppConLink();
      setOrdenSeleccionada(null); // Cerramos el modal
      fetchOrdenes(); // Refrescamos la lista de la pantalla principal
    }
  };

  const enviarWhatsAppConLink = () => {
    const cliente = ordenSeleccionada.equipos?.clientes;
    const equipo = ordenSeleccionada.equipos;
    const idOrden = ordenSeleccionada.id;

  const urlAprobacion = `https://mi-taller-app-beta.vercel.app/orden/${idOrden}`; // <--- LINK DINÁMICO

  //const mensaje = `Hola, el diagnóstico está listo. Revísalo y autoriza aquí:\n${urlAprobacion}`;


    // IMPORTANTE: Aquí va la URL donde subas tu página [id].tsx
    // Por ahora puedes dejarla así para probar la estructura del mensaje
    
    const mensaje = `Hola *${cliente?.nombre}* 👋, el diagnóstico de su *${equipo?.marca}* está listo.\n\n` +
      `*Presupuesto:* $${costoInput}\n\n` +
      `Para ver el detalle y autorizar la reparación con su firma, haga clic aquí:\n ${urlAprobacion}\n\n` +
      `*MiTallerApp* 🛠️`;

    const telLimpio = (cliente?.telefono || "").replace(/\D/g, '');
    const telFinal = telLimpio.length === 10 ? `52${telLimpio}` : telLimpio;

    Linking.openURL(`https://wa.me/${telFinal}?text=${encodeURIComponent(mensaje)}`);
  };
  // ... justo antes del return ( ...
  
  // --- FUNCIÓN PARA ENVIAR EL LINK MÁGICO POR WHATSAPP ---
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛠️ Órdenes Activas</Text>

      {loading ? ( 
        <ActivityIndicator size="large" color="#3498db" />
      ) : ( 
        <FlatList 
          data={ordenes} 
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => ( 
            <TouchableOpacity style={styles.card} onPress={() => {
                setOrdenSeleccionada(item);
                // Cargamos los datos existentes al abrir el modal
                setDiagnosticoInput(item.diagnostico || '');
                setCostoInput(item.costo_total?.toString() || '');
            }}> 
              <View style={styles.cardHeader}> 
                <Text style={[styles.badge, item.estatus === 'En Revisión' && {backgroundColor: '#f39c12'}]}>{item.estatus}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View> 
              <Text style={styles.equipoText}>{item.equipos?.marca} - {item.equipos?.identificador}</Text>
              <Text style={styles.clienteText}> 
                👤 ({item.equipos?.clientes?.telefono || 'S/T'}) - {item.equipos?.clientes?.nombre || 'Sin Nombre'}
              </Text> 
              <Text style={styles.fallaText} numberOfLines={1}>⚠️ {item.falla_reportada}</Text>
              {item.fotos_recepcion?.length > 0 && ( 
                <Text style={styles.fotoInfo}>📸 {item.fotos_recepcion.length} fotos de evidencia</Text>
              )} 
            </TouchableOpacity> 
          )} 
        /> 
      )} 
      
      {/* MODAL DE DETALLE Y DIAGNÓSTICO INTEGRADO */} 
      <Modal visible={!!ordenSeleccionada} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          {ordenSeleccionada && ( 
            <View style={{ padding: 20 }}> 
              <TouchableOpacity onPress={() => setOrdenSeleccionada(null)} style={styles.closeBtn}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>CERRAR</Text>
              </TouchableOpacity> 
              
              <Text style={styles.modalTitle}>Detalle de Orden</Text>
              
              <View style={styles.infoBox}> 
                <Text style={styles.labelHeader}>CLIENTE</Text>
                <Text style={styles.valueText}> 
                  ({ordenSeleccionada.equipos?.clientes?.telefono || 'S/T'}) - {ordenSeleccionada.equipos?.clientes?.nombre}
                </Text> 
              </View> 
              
              <View style={styles.infoBox}> 
                <Text style={styles.labelHeader}>EQUIPO / APARATO</Text>
                <Text style={styles.valueText}> 
                  ID: {ordenSeleccionada.equipos?.identificador} | Marca: {ordenSeleccionada.equipos?.marca}
                </Text> 
              </View> 
              
              <View style={styles.infoBox}>
                <Text style={styles.labelHeader}>MEDICIÓN DE ENTRADA (KM/CICLOS/HORAS)</Text>
                <Text style={styles.valueText}>
                  {ordenSeleccionada.medicion_entrada || 0} 
                </Text>
              </View>

              <Text style={styles.labelSection}>FALLA REPORTADA:</Text>
              <View style={styles.fallaContainer}> 
                <Text style={styles.fallaContent}>{ordenSeleccionada.falla_reportada}</Text>
              </View> 
              
              <Text style={styles.labelSection}>EVIDENCIAS FOTOGRÁFICAS:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
                {ordenSeleccionada.fotos_recepcion?.map((url: string, index: number) => ( 
                  <Image key={index} source={{ uri: url }} style={styles.bigImage} />
                ))} 
              </ScrollView> 

              {/* --- INPUTS PARA DIAGNÓSTICO Y COSTO --- */}
              <Text style={[styles.labelSection, {marginTop: 30}]}>DIAGNÓSTICO TÉCNICO:</Text>
              <TextInput
                style={styles.inputDiagnostico}
                placeholder="Escribe qué encontraste y cómo se reparará..."
                multiline
                numberOfLines={4}
                value={diagnosticoInput}
                onChangeText={setDiagnosticoInput}
              />

              <Text style={styles.labelSection}>COSTO ESTIMADO ($):</Text>
              <TextInput
                style={styles.inputCosto}
                placeholder="Ej: 1500"
                keyboardType="numeric"
                value={costoInput}
                onChangeText={setCostoInput}
              />
              
              {/* BOTÓN CLAVE PARA ENVIAR A REVISIÓN */}
              <TouchableOpacity 
                style={[styles.finishBtn, isSaving && {opacity: 0.7}]} 
                onPress={enviarARevision}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.finishBtnText}>🚀 GUARDAR Y ENVIAR LINK AL CLIENTE</Text>
                )}
              </TouchableOpacity>
              
              {/* EL BOTÓN ORIGINAL DE WHATSAPP AHORA ES PARA REENVIAR EL LINK SI ES NECESARIO */}
              <TouchableOpacity style={styles.whatsappBtn} onPress={enviarWhatsAppConLink}>
                 <Text style={styles.whatsappBtnText}>REENVIAR LINK POR WHATSAPP</Text>
              </TouchableOpacity> 

              <View style={{ height: 50 }} /> 
            </View> 
          )} 
        </ScrollView> 
      </Modal> 
    </View> 
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f7f6' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  badge: { backgroundColor: '#3498db', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, fontSize: 10, fontWeight: 'bold' },
  date: { fontSize: 12, color: '#95a5a6' },
  equipoText: { fontSize: 18, fontWeight: 'bold', color: '#34495e' },
  clienteText: { fontSize: 14, color: '#7f8c8d', marginVertical: 4 },
  fallaText: { fontSize: 13, color: '#e67e22', fontStyle: 'italic' },
  fotoInfo: { fontSize: 12, color: '#27ae60', marginTop: 8, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  closeBtn: { backgroundColor: '#e74c3c', padding: 12, borderRadius: 10, alignSelf: 'flex-end', marginTop: 10 },
  modalTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 25, color: '#2c3e50' },
  infoBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 12, marginBottom: 12, borderLeftWidth: 5, borderLeftColor: '#3498db', elevation: 1 },
  labelHeader: { fontSize: 10, fontWeight: 'bold', color: '#95a5a6', marginBottom: 4, letterSpacing: 1 },
  valueText: { fontSize: 16, color: '#2c3e50', fontWeight: '600' },
  labelSection: { fontSize: 14, fontWeight: 'bold', color: '#343a40', marginTop: 15, marginBottom: 8 },
  fallaContainer: { backgroundColor: '#fdf2e9', padding: 18, borderRadius: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#fab1a0' },
  fallaContent: { color: '#d35400', fontSize: 15, lineHeight: 22 },
  bigImage: { width: 300, height: 450, borderRadius: 20, marginRight: 15, backgroundColor: '#eee' },
  whatsappBtn: { backgroundColor: '#25D366', padding: 18, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2 },
  whatsappBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // --- NUEVOS ESTILOS ---
  inputDiagnostico: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  inputCosto: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 10, 
    padding: 15, 
    backgroundColor: '#f9f9f9', 
    marginTop: 5, 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  finishBtn: {
    backgroundColor: '#f39c12', // Naranja para "En Revisión"
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 25,
  },
  finishBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
