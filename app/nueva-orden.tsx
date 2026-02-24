import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } // 👈 Agregamos Linking
  from 'react-native';
import { supabase } from '../supabase';

export default function NuevaOrdenScreen() { 
  const router = useRouter(); 
  // Control de estados 
  const [sugerencias, setSugerencias] = useState<any[]>([]); 
  const [clienteIdExistente, setClienteIdExistente] = useState<string | null>(null); 
  const [cargando, setCargando] = useState(false); 
  
  // --- ESTADOS PARA MULTIPLE FOTOS --- 
  const [fotosUris, setFotosUris] = useState<string[]>([]); 
  const [fotosBase64, setFotosBase64] = useState<string[]>([]); 
  // Datos del Cliente 
  const [nombre, setNombre] = useState(''); 
  const [telefono, setTelefono] = useState(''); 
  const [direccion, setDireccion] = useState(''); 
  const [email, setEmail] = useState(''); 
  // Datos del Equipo 
  const [identificador, setIdentificador] = useState(''); 
  const [marca, setMarca] = useState(''); 
  // Datos de la Recepción 
  const [falla, setFalla] = useState(''); 
  const [medicion, setMedicion] = useState(''); 
  const empresa_id = '0a972b41-d2cd-4578-ad04-e32a84d856f7'; 
  
  // --- 1. RECUPERACIÓN DE DATOS (POR SI LA APP MURIÓ) --- 
  useEffect(() => { 
    const recuperarTodo = async () => { 
      // A. Recuperar fotos perdidas por el crash de la cámara 
      const pending = await ImagePicker.getPendingResultAsync(); 
      if (pending && Array.isArray(pending) && pending.length > 0) { 
        for (const res of pending) { 
          if (!res.canceled && res.assets && res.assets.length > 0) { 
            setFotosUris(prev => [...prev, res.assets[0].uri]); 
            if (res.assets[0].base64) { 
              setFotosBase64(prev => [...prev, res.assets[0].base64!]); 
            } 
          } 
        } 
      } 
      // B. Recuperar borrador del formulario de AsyncStorage 
      const borrador = await AsyncStorage.getItem('borrador_orden'); 
      if (borrador) { 
        const d = JSON.parse(borrador); 
        setNombre(d.nombre || ''); setTelefono(d.telefono || ''); setDireccion(d.direccion || ''); 
        setEmail(d.email || ''); setIdentificador(d.identificador || ''); setMarca(d.marca || ''); 
        setFalla(d.falla || ''); setMedicion(d.medicion || ''); 
        setClienteIdExistente(d.clienteIdExistente || null); 
      } 
    }; 
    recuperarTodo(); 
  }, []); 

  // --- 2. GUARDADO AUTOMÁTICO DE BORRADOR --- 
  useEffect(() => { 
    const guardarBorrador = async () => { 
      const datos = { nombre, telefono, direccion, email, identificador, marca, falla, medicion, clienteIdExistente }; 
      await AsyncStorage.setItem('borrador_orden', JSON.stringify(datos)); 
    }; 
    guardarBorrador(); 
  }, [nombre, telefono, direccion, email, identificador, marca, falla, medicion, clienteIdExistente]); 
  
  // --- 3. FUNCIÓN WHATSAPP DE RECEPCIÓN (NUEVA FUNCIÓN) ---
  const enviarWhatsAppDeRecepcion = (clienteNombre: string, clienteTel: string, equipoMarca: string, ordenId: string) => {
    const urlAprobacion = `https://mi-taller-app-beta.vercel.app/orden/${ordenId}`;    
    const mensaje = `Hola *${clienteNombre}* 👋, hemos recibido su *${equipoMarca}* con éxito.\n\n` +
      `*Orden:* #${ordenId.slice(0, 8)}\n` +
      `*Falla:* ${falla}\n\n` +
      `Siga su reparación aquí:\n${urlAprobacion}\n\n` +
      `*MiTallerApp* 🛠️`;

    const telLimpio = clienteTel.replace(/\D/g, '');
    const telFinal = telLimpio.length === 10 ? `52${telLimpio}` : telLimpio; // Asume México si son 10 dígitos
    Linking.openURL(`https://wa.me{telFinal}?text=${encodeURIComponent(mensaje)}`);
  };
  
  // --- FUNCIÓN PARA TOMAR FOTO (OPTIMIZADA DEL PDF) --- 
  const tomarFoto = async () => { 
    const { status } = await ImagePicker.requestCameraPermissionsAsync(); 
    if (status !== 'granted') return Alert.alert("Error", "Sin acceso a cámara"); 
    const result = await ImagePicker.launchCameraAsync({ 
      mediaTypes: ['images'], 
      allowsEditing: false, // Desactivado para evitar crash por memoria
      quality: 0.3, // Calidad optimizada
      base64: true, 
    }); 
    if (!result.canceled && result.assets) { 
      setFotosUris((prev) => [...prev, result.assets[0].uri]); 
      if (result.assets[0].base64) { 
        setFotosBase64((prev) => [...prev, result.assets[0].base64!]); 
      } 
    } 
  }; 
  
  // --- FUNCIÓN PARA SUBIR TODA LA GALERÍA --- 
  async function subirTodasLasFotos(): Promise<string[]> { 
    const urlsPublicas: string[] = []; 
    for (const b64 of fotosBase64) { 
      const fileName = `recepcion_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`; 
      const { data, error } = await supabase.storage 
        .from('evidencias') 
        .upload(fileName, decode(b64), { contentType: 'image/jpeg' }); 
      if (!error) { 
        const { data: urlData } = supabase.storage.from('evidencias').getPublicUrl(fileName); 
        urlsPublicas.push(urlData.publicUrl); 
      } 
    } 
    return urlsPublicas; 
  } 

  // --- BÚSQUEDA DE CLIENTE --- 
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
    if (!nombre || !telefono || !identificador) { 
      return Alert.alert("Faltan datos", "Nombre, Teléfono e ID del Equipo son obligatorios."); 
    } 
    setCargando(true); 
    try { 
      let finalClienteId = clienteIdExistente; 
      // 1. SUBIR FOTOS 
      const linksDeFotos = await subirTodasLasFotos(); 
      // 2. CLIENTE (Si es nuevo) 
      if (!finalClienteId) { 
        const { data: nuevoCliente, error: errCliente } = await supabase 
          .from('clientes').insert([{ nombre, telefono, direccion, email, empresa_id }]).select().single(); 
        if (errCliente) throw errCliente; 
        finalClienteId = nuevoCliente.id; 
      } 
      // 3. EQUIPO 
      const { data: equipo, error: errEquipo } = await supabase 
        .from('equipos').insert([{ identificador, marca, cliente_id: finalClienteId, empresa_id }]).select().single(); 
      if (errEquipo) throw errEquipo; 

      // 4. ORDEN: Agregamos .select('id').single() para obtener el ID y pasarlo a WhatsApp
      const { data: ordenCreada, error: errOrden } = await supabase 
        .from('ordenes').insert([{ 
          equipo_id: equipo.id, 
          medicion_entrada: parseInt(medicion) || 0, 
          falla_reportada: falla, 
          estatus: 'Abierta', 
          empresa_id: empresa_id, 
          fotos_recepcion: linksDeFotos 
        }]).select('id').single(); 
      if (errOrden) throw errOrden; 
      
      // 5. DISPARAMOS EL WHATSAPP
      enviarWhatsAppDeRecepcion(nombre, telefono, marca, ordenCreada.id);

      // 6. LIMPIAR BORRADOR TRAS ÉXITO 
      await AsyncStorage.removeItem('borrador_orden'); 
      Alert.alert("✅ ¡ORDEN CREADA!", `Se guardaron ${linksDeFotos.length} fotos y se envió WA.`); 
      // Limpiar estados locales para un nuevo formulario 
      setNombre(''); setTelefono(''); setIdentificador(''); setMarca(''); setMedicion(''); setFalla(''); 
      setClienteIdExistente(null); setFotosUris([]); setFotosBase64([]); 
      
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
        <View style={styles.row}> 
          <Text style={styles.label}>DATOS DEL DUEÑO</Text> 
          <TouchableOpacity onPress={() => router.push('/clientes')} style={styles.addBtn}> 
            <Text style={styles.addBtnText}>+ NUEVO</Text> 
          </TouchableOpacity> 
        </View> 
        {/* BUSCADOR POR TELÉFONO */} 
        <TextInput 
          style={styles.input} 
          placeholder="🔍 Teléfono (Buscar...)" 
          value={telefono} 
          onChangeText={buscarCliente} 
          keyboardType="phone-pad" 
        /> 
        {/* SUGERENCIAS DE CLIENTES */} 
        {sugerencias.map((c) => ( 
          <TouchableOpacity key={c.id} style={styles.suggestion} onPress={() => seleccionarCliente(c)}> 
            <Text style={styles.suggestionName}>{c.nombre}</Text> 
            <Text style={styles.suggestionPhone}>📞 {c.telefono}</Text> 
          </TouchableOpacity> 
        ))} 
        {/* NOMBRE */} 
        <TextInput 
          style={[styles.input, clienteIdExistente && styles.inputDisabled]} 
          placeholder="👤 Nombre" 
          value={nombre} 
          onChangeText={setNombre} 
          editable={!clienteIdExistente} 
        /> 
         <TextInput 
          style={[styles.input, clienteIdExistente && styles.inputDisabled]} 
          placeholder="📧 Correo Electrónico" 
          value={email} 
          onChangeText={setEmail} 
          keyboardType="email-address" 
          editable={!clienteIdExistente} 
        /> 
         <TextInput 
          style={[styles.input, clienteIdExistente && styles.inputDisabled]} 
          placeholder="📍 Dirección / Ubicación" 
          value={direccion} 
          onChangeText={setDireccion} 
          editable={!clienteIdExistente} 
        /> 
        {/* BOTÓN PARA RESETEAR CLIENTE SI SE SELECCIONÓ UNO MAL */} 
        {clienteIdExistente && ( 
          <TouchableOpacity onPress={() => { 
            setClienteIdExistente(null); 
            setNombre(''); setTelefono(''); setDireccion(''); setEmail(''); 
          }}> 
            <Text style={styles.resetText}>✕ Cambiar Cliente / Editar Datos</Text> 
          </TouchableOpacity> 
        )} 
      </View> 
      
      <View style={styles.section}> 
        <Text style={styles.label}>DATOS DEL APARATO / VEHÍCULO</Text> 
        <TextInput style={styles.input} placeholder="ID (Placas, Serie, IMEI)" value={identificador} onChangeText={setIdentificador} /> 
        <TextInput style={styles.input} placeholder="Marca y Modelo" value={marca} onChangeText={setMarca} /> 
      </View> 

      <View style={styles.section}> 
        <Text style={styles.label}>ESTADO DE ENTRADA Y EVIDENCIAS</Text> 
        <TextInput style={styles.input} placeholder="Medición (KM, Ciclos, Horas)" keyboardType="numeric" value={medicion} onChangeText={setMedicion} /> 
        <TextInput style={[styles.input, {height: 60}]} placeholder="Falla reportada" multiline value={falla} onChangeText={setFalla} /> 
        
        <ScrollView horizontal style={styles.galeria}> 
          {fotosUris.map((uri, index) => ( 
            <View key={index} style={styles.fotoContainer}> 
              <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" /> 
              <TouchableOpacity style={styles.removeBadge} onPress={() => { 
                setFotosUris(fotosUris.filter((_, i) => i !== index)); 
                setFotosBase64(fotosBase64.filter((_, i) => i !== index)); 
              }}> 
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
        <Text style={styles.btnText}>{cargando ? "SUBIENDO EVIDENCIAS..." : "GUARDAR EXPEDIENTE"}</Text>
      </TouchableOpacity> 
    </ScrollView> 
  ); 
} 

const styles = StyleSheet.create({ 
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' }, 
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50' }, 
  section: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 }, 
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, 
  label: { fontSize: 12, fontWeight: 'bold', color: '#3498db', marginBottom: 5 }, 
  input: { borderBottomWidth: 1, borderColor: '#eee', padding: 10, marginBottom: 10, fontSize: 16 }, 
  inputDisabled: { backgroundColor: '#f0f0f0', color: '#888' }, 
  addBtn: { backgroundColor: '#2ecc71', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 }, 
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' }, 
  suggestion: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', borderLeftWidth: 4, borderLeftColor: '#3498db' }, 
  suggestionName: { fontWeight: 'bold', color: '#2c3e50' }, 
  suggestionPhone: { fontSize: 12, color: '#7f8c8d' }, 
  resetText: { color: '#e74c3c', fontSize: 12, textAlign: 'right', marginTop: 5 }, 
  galeria: { flexDirection: 'row', marginBottom: 15, paddingVertical: 5 }, 
  fotoContainer: { marginRight: 12, position: 'relative' }, 
  thumbnail: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#eee' }, 
  removeBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#e74c3c', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }, 
  fotoBtn: { backgroundColor: '#f1c40f', padding: 15, borderRadius: 10, alignItems: 'center' }, 
  fotoBtnText: { color: '#2c3e50', fontWeight: 'bold' }, 
  btn: { backgroundColor: '#3498db', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 }, 
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 } 
});
