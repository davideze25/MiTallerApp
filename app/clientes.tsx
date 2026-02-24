import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

export default function CatálogoClientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Estados para el formulario (Los campos de tu imagen)
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [rfc, setRfc] = useState('');
  const [email, setEmail] = useState('');

  const empresa_id = '0a972b41-d2cd-4578-ad04-e32a84d856f7'; // Tu ID de empresa

  useEffect(() => { fetchClientes(); }, []);

  // --- BUSCAR Y LISTAR ---
    async function fetchClientes() {
    setLoading(true);
    
    // Usamos .or() para buscar en DOS columnas al mismo tiempo
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .or(`nombre.ilike.%${busqueda}%,telefono.ilike.%${busqueda}%`) 
      .order('nombre', { ascending: true });
    
    if (error) console.error("Error en búsqueda:", error.message);
    if (data) setClientes(data);
    
    setLoading(false);
  }


  // --- GUARDAR (NUEVO O MODIFICAR) ---
  async function guardarCliente() {
    if (!nombre || !telefono) return Alert.alert("Error", "Nombre y Teléfono son obligatorios");

    const datos = { nombre, telefono, direccion, rfc, email, empresa_id };

    if (editId) {
      // MODIFICAR
      const { error } = await supabase.from('clientes').update(datos).eq('id', editId);
      if (error) Alert.alert("Error", error.message);
      else Alert.alert("Éxito", "Cliente actualizado correctamente");
    } else {
      // NUEVO
      const { error } = await supabase.from('clientes').insert([datos]);
      if (error) Alert.alert("Error", error.message);
      else Alert.alert("Éxito", "Cliente registrado correctamente");
    }

    cerrarModal();
    fetchClientes();
  }

  // --- ELIMINAR ---
  async function eliminarCliente(id: string) {
    Alert.alert("¿Eliminar?", "Esta acción no se puede deshacer",);
  }

  function abrirModal(cliente?: any) {
    if (cliente) {
      setEditId(cliente.id);
      setNombre(cliente.nombre);
      setTelefono(cliente.telefono);
      setDireccion(cliente.direccion || '');
      setRfc(cliente.rfc || '');
      setEmail(cliente.email || '');
    }
    setModalVisible(true);
  }

  function cerrarModal() {
    setEditId(null);
    setNombre(''); setTelefono(''); setDireccion(''); setRfc(''); setEmail('');
    setModalVisible(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👥 Catálogo de Clientes</Text>

      {/* BUSCADOR */}
      <TextInput 
        style={styles.searchBar} 
        placeholder="Buscar por nombre o teléfono..." // <-- Actualiza el placeholder
        value={busqueda}
        onChangeText={(text) => {
            setBusqueda(text);
            // Agregamos un pequeño retraso o lo llamamos directo
            fetchClientes(); 
        }}
        />

      <FlatList
        data={clientes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{item.nombre}</Text>
              <Text style={styles.clientInfo}>📞 {item.telefono}</Text>
              <Text style={styles.clientInfo}>📧 {item.email || 'Sin correo'}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => abrirModal(item)} style={styles.btnEdit}><Text>📝</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => eliminarCliente(item.id)} style={styles.btnDelete}><Text>🗑️</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.btnAdd} onPress={() => abrirModal()}>
        <Text style={styles.btnAddText}>+ NUEVO CLIENTE</Text>
      </TouchableOpacity>

      {/* FORMULARIO MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBG}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>{editId ? 'Modificar Cliente' : 'Nuevo Cliente'}</Text>
            
            <TextInput style={styles.input} placeholder="Nombre completo" value={nombre} onChangeText={setNombre} />
            <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={telefono} onChangeText={setTelefono} />
            <TextInput style={styles.input} placeholder="Correo Electrónico" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="RFC" value={rfc} onChangeText={setRfc} />
            <TextInput style={[styles.input, {height: 60}]} placeholder="Dirección" multiline value={direccion} onChangeText={setDireccion} />

            <TouchableOpacity style={styles.saveBtn} onPress={guardarCliente}>
              <Text style={styles.btnText}>GUARDAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={cerrarModal}>
              <Text style={styles.btnText}>CANCELAR</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f6fa' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 15, color: '#2f3640' },
  searchBar: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#dcdde1' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  clientName: { fontSize: 18, fontWeight: 'bold', color: '#2f3640' },
  clientInfo: { fontSize: 14, color: '#7f8c8d', marginTop: 2 },
  actions: { flexDirection: 'row' },
  btnEdit: { padding: 10, backgroundColor: '#f1c40f', borderRadius: 8, marginRight: 5 },
  btnDelete: { padding: 10, backgroundColor: '#e74c3c', borderRadius: 8 },
  btnAdd: { backgroundColor: '#3498db', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnAddText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalBG: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#dcdde1', padding: 12, borderRadius: 10, marginBottom: 12 },
  saveBtn: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  cancelBtn: { backgroundColor: '#95a5a6', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
