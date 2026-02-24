import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system'; // 👈 IMPORTANTE: Para procesar fotos sin saturar RAM
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

export default function NuevaOrdenScreen() {
  const router = useRouter();

  // --- ESTADOS ---
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [clienteIdExistente, setClienteIdExistente] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  
  // Guardamos solo URIs para que la RAM esté ligera
  const [fotosUris, setFotosUris] = useState<string[]>([]);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');
  const [identificador, setIdentificador] = useState('');
  const [marca, setMarca] = useState('');
  const [falla, setFalla] = useState('');
  const [medicion, setMedicion] = useState('');
  
  const empresa_id = '0a972b41-d2cd-4578-ad04-e32a84d856f7';

  // --- 1. RECUPERACIÓN DE DATOS (PROTECCIÓN CONTRA CRASH) ---
  useEffect(() => {
    const recuperarTodo = async () => {
      // Recuperar fotos si la app se reinició
      const pending = await ImagePicker.getPendingResultAsync();
      if (pending && Array.isArray(pending) && pending.length > 0) {
        for (const res of pending) {
          if (!res.canceled && res.assets && res.assets.length > 0) {
            setFotosUris(prev => [...prev, res.assets[0].uri]);
          }
        }
      }

      // Recuperar borrador del formulario
      const borrador = await AsyncStorage.getItem('borrador_orden');
      if (borrador) {
        const d = JSON.parse(borrador);
        setNombre(d.nombre || ''); setTelefono(d.telefono || ''); setDireccion(d.direccion || '');
        setEmail(d.email || ''); setIdentificador(d.identificador || ''); setMarca(d.marca || '');
        setFalla(d.falla || ''); setMedicion(d.medicion || '');
        setClienteIdExistente(d.clienteIdExistente || null);
        if(d.fotosUris) setFotosUris(d.fotosUris);
      }
    };
    recuperarTodo();
  }, []);

  // --- 2. GUARDADO AUTOMÁTICO DE BORRADOR ---
  useEffect(() => {
    const guardarBorrador = async () => {
      const datos = { nombre, telefono, direccion, email, identificador, marca, falla, medicion, clienteIdExistente, fotosUris };
      await AsyncStorage.setItem('borrador_orden', JSON.stringify(datos));
    };
    guardarBorrador();
  }, [nombre, telefono, direccion, email, identificador, marca, falla, medicion, clienteIdExistente, fotosUris]);

  // --- 3. WHATSAPP DE BIENVENIDA ---
  const enviarWhatsAppDeRecepcion = (clienteNombre: string, clienteTel: string, equipoMarca: string, ordenId: string) => {
    const urlAprobacion = `https://mi-taller-app-beta.vercel.app{ordenId}`;
    const mensaje = `Hola *${clienteNombre}* 👋, hemos recibido su *${equipoMarca}* con éxito.\n\n` +
      `*Orden:* #${ordenId.slice(0, 8)}\n` +
      `*Falla:* ${falla}\n\n` +
      `Siga su reparación aquí:\n${urlAprobacion}\n\n` +
      `*MiTallerApp* 🛠️`;

    const telLimpio = clienteTel.replace(/\D/g, '');
    const telFinal = telLimpio.length === 10 ? `52${telLimpio}` : telLimpio;
    Linking.openURL(`https://wa.me{telFinal}?text=${encodeURIComponent(mensaje)}`);
  };

  // --- 4. CÁMARA OPTIMIZADA (SIN BASE64) ---
  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Error", "Sin acceso a cámara");
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], 
      allowsEditing: false, 
      quality: 0.4, // Un poco más de calidad ya que no usamos base64 inmediato
      base64: false, // 👈 CLAVE: Evita que Android mate la app por memoria
    });

    if (!result.canceled && result.assets) { 
      setFotosUris((prev) => [...prev, result.assets[0].uri]); 
    }
  };

  // --- 5. SUBIDA DE FOTOS (CONVERSIÓN AL VUELO) ---
  async function subirFotosDinamicas(): Promise<string[]> {
    const urls: string[] = [];
    for (const uri of fotosUris) {
      // Convertimos a base64 solo en este momento (cuando la cámara ya cerró)      
      const b64 = await FileSystem.readAsStringAsync(uri, { 
        encoding: 'base64' // 👈 Cambia FileSystem.EncodingType.Base64 por el texto 'base64'
      });
      const fileName = `rec_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      const { error } = await supabase.storage
        .from('evidencias')
        .upload(fileName, decode(b64), { contentType: 'image/jpeg' });
      
      if (!error) {
        const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(fileName);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  }

  // --- LÓGICA DE CLIENTES ---
  async function buscarCliente(text: string) {
    setTelefono(text);
    setClienteIdExistente(null);
    if (text.length > 3) {
      const { data } = await supabase.from('clientes').select('*').ilike('telefono', `%${text}%`).limit(3);
      setSugerencias(data || []);
    } else { setSugerencias([]); }
  }

  const seleccionarCliente = (c: any) => {
    setNombre(c.nombre); setTelefono(c.telefono); setDireccion(c.direccion || '');
    setEmail(c.email || ''); setClienteIdExistente(c.id); setSugerencias([]);
  };

  // --- GUARDADO FINAL ---
  async function generarTodo() {
    if (!nombre || !telefono || !identificador) return Alert.alert("Faltan datos", "Campos obligatorios vacíos.");
    setCargando(true);
    try {
      const links = await subirFotosDinamicas();
      let cId = clienteIdExistente;
      
      if (!cId) {
        const { data: nc, error: ec } = await supabase.from('clientes').insert([{ nombre, telefono, direccion, email, empresa_id }]).select().single();
        if (ec) throw ec;
        cId = nc.id;
      }

      const { data: eq, error: ee } = await supabase.from('equipos').insert([{ identificador, marca, cliente_id: cId, empresa_id }]).select().single();
      if (ee) throw ee;

      const { data: orden, error: eo } = await supabase.from('ordenes').insert([{
        equipo_id: eq.id,
        medicion_entrada: parseInt(medicion) || 0,
        falla_reportada: falla,
        estatus: 'Abierta',
        empresa_id,
        fotos_recepcion: links
      }]).select().single();
      if (eo) throw eo;

      await AsyncStorage.removeItem('borrador_orden');
      enviarWhatsAppDeRecepcion(nombre, telefono, marca, orden.id);

      Alert.alert("✅ Éxito", "Expediente guardado y WhatsApp enviado.");
      router.replace('/(tabs)');
      
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📋 Recepción de Equipo</Text>

      <View style={styles.section}>
        <Text style={styles.label}>DATOS DEL DUEÑO</Text>
        <TextInput style={styles.input} placeholder="🔍 Buscar Teléfono..." value={telefono} onChangeText={buscarCliente} keyboardType="phone-pad" />
        {sugerencias.map((c) => (
          <TouchableOpacity key={c.id} style={styles.suggestion} onPress={() => seleccionarCliente(c)}>
            <Text style={styles.suggestionName}>{c.nombre}</Text>
            <Text style={styles.suggestionPhone}>📞 {c.telefono}</Text>
          </TouchableOpacity>
        ))}
        <TextInput style={[styles.input, clienteIdExistente && styles.inputDisabled]} placeholder="👤 Nombre" value={nombre} onChangeText={setNombre} editable={!clienteIdExistente} />
        <TextInput style={[styles.input, clienteIdExistente && styles.inputDisabled]} placeholder="📧 Correo" value={email} onChangeText={setEmail} editable={!clienteIdExistente} />
        <TextInput style={[styles.input, clienteIdExistente && styles.inputDisabled]} placeholder="📍 Dirección" value={direccion} onChangeText={setDireccion} editable={!clienteIdExistente} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>DATOS DEL EQUIPO</Text>
        <TextInput style={styles.input} placeholder="ID / Placas / Serie" value={identificador} onChangeText={setIdentificador} />
        <TextInput style={styles.input} placeholder="Marca / Modelo" value={marca} onChangeText={setMarca} />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>RECEPCIÓN Y FOTOS</Text>
        <TextInput style={styles.input} placeholder="Medición (KM, Ciclos, Horas)" keyboardType="numeric" value={medicion} onChangeText={setMedicion} />
        <TextInput style={[styles.input, {height: 60}]} placeholder="Falla reportada" multiline value={falla} onChangeText={setFalla} />

        <ScrollView horizontal style={styles.galeria}>
          {fotosUris.map((uri, index) => (
            <View key={index} style={styles.fotoContainer}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity style={styles.removeBadge} onPress={() => setFotosUris(fotosUris.filter((_, i) => i !== index))}>
                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 10}}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.fotoBtn} onPress={tomarFoto}>
          <Text style={styles.fotoBtnText}>📸 TOMAR FOTO DE EVIDENCIA</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.btn, cargando && {opacity: 0.5}]} onPress={generarTodo} disabled={cargando}>
        <Text style={styles.btnText}>{cargando ? "PROCESANDO..." : "GUARDAR EXPEDIENTE"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50' },
  section: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#3498db', marginBottom: 5 },
  input: { borderBottomWidth: 1, borderColor: '#eee', padding: 10, marginBottom: 10, fontSize: 16 },
  inputDisabled: { backgroundColor: '#f0f0f0', color: '#888' },
  suggestion: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', borderLeftWidth: 4, borderLeftColor: '#3498db' },
  suggestionName: { fontWeight: 'bold' },
  suggestionPhone: { fontSize: 12, color: '#7f8c8d' },
  galeria: { flexDirection: 'row', marginVertical: 10 },
  fotoContainer: { marginRight: 12, position: 'relative' },
  thumbnail: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#eee' },
  removeBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#e74c3c', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  fotoBtn: { backgroundColor: '#f1c40f', padding: 15, borderRadius: 10, alignItems: 'center' },
  fotoBtnText: { color: '#2c3e50', fontWeight: 'bold' },
  btn: { backgroundColor: '#3498db', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
