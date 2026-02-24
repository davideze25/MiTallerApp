import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../../supabase'; // Verifica que la ruta a tu archivo supabase.ts sea correcta

export default function PaginaAutorizacionPublica() {
  const { id } = useLocalSearchParams();
  const [orden, setOrden] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const sigCanvas = useRef<any>(null);

  useEffect(() => {
    if (id) fetchOrden();
  }, [id]);

  async function fetchOrden() {
    const { data, error } = await supabase
      .from('ordenes')
      .select(`
        *,
        equipos (
          marca,
          identificador,
          clientes ( nombre )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error:", error.message);
    } else {
      setOrden(data);
    }
    setLoading(false);
  }

  const handleAutorizar = async () => {
    if (sigCanvas.current.isEmpty()) {
      return alert("Por favor, firma en el recuadro antes de continuar.");
    }

    setEnviando(true);
    
    // 1. Obtener la firma (puedes guardarla en Storage después, por ahora actualizamos estatus)
    // const firmaBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

    // 2. Actualizar la orden en Supabase
    const { error } = await supabase
      .from('ordenes')
      .update({ 
        estatus: 'En Reparación', // El técnico recibe la señal de inicio
        fecha_autorizacion: new Date().toISOString()
      })
      .eq('id', id);

    setEnviando(false);

    if (error) {
      alert("Error al procesar: " + error.message);
    } else {
      Alert.alert("¡Autorizado!", "Gracias por su confianza. Su reparación ha comenzado.");
      setShowSignature(false);
      fetchOrden(); // Refresca para mostrar el nuevo estatus
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 100 }} color="#2563eb" />;
  if (!orden) return <Text style={styles.errorText}>Orden no encontrada o enlace expirado.</Text>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'center' }}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.brand}>MiTallerApp 🛠️</Text>
        <Text style={styles.folio}>FOLIO: #{id?.toString().slice(0, 8).toUpperCase()}</Text>
      </View>

      <View style={styles.main}>
        {/* TARJETA DE RESUMEN */}
        <View style={styles.card}>
          <Text style={styles.label}>CLIENTE</Text>
          <Text style={styles.value}>{orden.equipos?.clientes?.nombre}</Text>
          <View style={styles.divider} />
          <Text style={styles.label}>EQUIPO / VEHÍCULO</Text>
          <Text style={styles.value}>{orden.equipos?.marca} - {orden.equipos?.identificador}</Text>
        </View>

        {/* DIAGNÓSTICO */}
        <View style={styles.card}>
          <Text style={[styles.label, { color: '#f97316' }]}>FALLA REPORTADA</Text>
          <Text style={styles.fallaText}>"{orden.falla_reportada}"</Text>
          
          <Text style={[styles.label, { color: '#2563eb', marginTop: 15 }]}>DIAGNÓSTICO TÉCNICO</Text>
          <View style={styles.diagBox}>
            <Text style={styles.diagText}>{orden.diagnostico || "Pendiente de redactar por el técnico."}</Text>
          </View>
        </View>

        {/* EVIDENCIAS FOTOGRÁFICAS */}
        <Text style={styles.labelSection}>FOTOS DE RECEPCIÓN</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
          {orden.fotos_recepcion?.map((url: string, i: number) => (
            <Image key={i} source={{ uri: url }} style={styles.imgEvidence} />
          ))}
        </ScrollView>

        {/* PRECIO DESTACADO */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>PRESUPUESTO ESTIMADO</Text>
          <Text style={styles.priceValue}>${orden.costo_total}</Text>
          <Text style={styles.priceNote}>* Incluye refacciones y mano de obra.</Text>
        </View>

        {/* FLUJO DE FIRMA */}
        {!showSignature ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.btnReject} onPress={() => alert("Solicitud de aclaración enviada.")}>
              <Text style={styles.btnTextReject}>RECHAZAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnAccept} onPress={() => setShowSignature(true)}>
              <Text style={styles.btnTextAccept}>ACEPTAR Y FIRMAR</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.signatureWrapper}>
            <Text style={styles.signTitle}>FIRME CON SU DEDO EN EL CUADRO:</Text>
            <View style={styles.canvasContainer}>
              <SignatureCanvas 
                ref={sigCanvas}
                canvasProps={{ style: { width: '100%', height: 200, backgroundColor: '#fdfdfd' } }} 
              />
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={() => setShowSignature(false)} style={{ flex: 1 }}>
                <Text style={{ textAlign: 'center', color: '#64748b' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleAutorizar} disabled={enviando}>
                {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTextAccept}>ENVIAR AUTORIZACIÓN</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#1e293b', width: '100%', padding: 40, alignItems: 'center' },
  brand: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  folio: { color: '#94a3b8', fontSize: 11, marginTop: 5, fontWeight: 'bold' },
  main: { padding: 16, width: '100%', maxWidth: 500 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  label: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', marginBottom: 5 },
  labelSection: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginLeft: 10, marginBottom: 10 },
  value: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  fallaText: { fontSize: 14, color: '#475569', fontStyle: 'italic' },
  diagBox: { backgroundColor: '#eff6ff', padding: 15, borderRadius: 15, marginTop: 5, borderLeftWidth: 4, borderLeftColor: '#2563eb' },
  diagText: { color: '#1e40af', fontSize: 15, lineHeight: 22 },
  gallery: { marginBottom: 20 },
  imgEvidence: { width: 160, height: 220, borderRadius: 15, marginRight: 12, backgroundColor: '#cbd5e1' },
  priceCard: { backgroundColor: '#0f172a', padding: 25, borderRadius: 24, alignItems: 'center', marginVertical: 10 },
  priceLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
  priceValue: { color: '#4ade80', fontSize: 44, fontWeight: '900' },
  priceNote: { color: '#475569', fontSize: 9, marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10, alignItems: 'center' },
  btnReject: { flex: 1, padding: 18, borderRadius: 18, borderWidth: 2, borderColor: '#ef4444', alignItems: 'center' },
  btnAccept: { flex: 2, padding: 18, borderRadius: 18, backgroundColor: '#10b981', alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnConfirm: { flex: 2, padding: 18, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center' },
  btnTextReject: { color: '#ef4444', fontWeight: 'bold' },
  btnTextAccept: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  signatureWrapper: { backgroundColor: '#fff', padding: 20, borderRadius: 25, borderWidth: 2, borderColor: '#10b981' },
  signTitle: { textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
  canvasContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 15, overflow: 'hidden', marginBottom: 20 },
  errorText: { textAlign: 'center', marginTop: 100, color: '#64748b', fontSize: 16 }
});
