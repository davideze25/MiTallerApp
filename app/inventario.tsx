import React, { useEffect, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

export default function InventarioScreen() {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Estados para el formulario
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');

  useEffect(() => { fetchInventario(); }, []);

   async function fetchInventario() {
    setLoading(true);
    // 1. Quitamos el .order() para que no busque 'created_at'
    const { data, error } = await supabase.from('inventario').select('*');
    
    if (error) {
      console.error("Error cargando inventario:", error.message);
      alert("Error: " + error.message); // Esto nos dirá si falta una columna
    } else {
      console.log("Productos encontrados:", data);
      setProductos(data || []);
    }
    setLoading(false);
  }


  // --- FUNCIÓN MÁGICA PARA GUARDAR ---
  async function guardarProducto() {
    if (!nombre || !precio || !stock) {
      alert("Por favor llena los campos principales");
      return;
    }

    const { error } = await supabase.from('inventario').insert([
      { 
        nombre, 
        clave, 
        precio_venta: parseFloat(precio), 
        cantidad: parseInt(stock),
        empresa_id: '0a972b41-d2cd-4578-ad04-e32a84d856f7' // Tu UUID que ya verificamos
      }
    ]);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setModalVisible(false); // Cerramos la ventana
      setNombre(''); setClave(''); setPrecio(''); setStock(''); // Limpiamos campos
      fetchInventario(); // Refrescamos la lista para ver el nuevo
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📦 Inventario del Taller</Text>

      <FlatList
        data={productos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.itemName}>{item.nombre}</Text>
              <Text style={styles.itemSub}>{item.clave}</Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
              <Text style={styles.itemPrice}>${item.precio_venta}</Text>
              <Text style={styles.itemStock}>Stock: {item.cantidad}</Text>
            </View>
          </View>
        )}
      />

      {/* BOTÓN PARA ABRIR EL MODAL */}
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ Agregar Producto</Text>
      </TouchableOpacity>

      {/* VENTANITA (MODAL) DEL FORMULARIO */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBG}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuevo Producto</Text>
            
            <TextInput style={styles.input} placeholder="Nombre (ej: Filtro de Aire)" value={nombre} onChangeText={setNombre} />
            <TextInput style={styles.input} placeholder="Clave / Código" value={clave} onChangeText={setClave} />
            <TextInput style={styles.input} placeholder="Precio de Venta" keyboardType="numeric" value={precio} onChangeText={setPrecio} />
            <TextInput style={styles.input} placeholder="Stock Inicial" keyboardType="numeric" value={stock} onChangeText={setStock} />

            <TouchableOpacity style={[styles.btn, {backgroundColor: '#2ecc71'}]} onPress={guardarProducto}>
              <Text style={styles.btnText}>GUARDAR EN BASE DE DATOS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, {backgroundColor: '#e74c3c', marginTop: 10}]} onPress={() => setModalVisible(false)}>
              <Text style={styles.btnText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', elevation: 2 },
  itemName: { fontSize: 18, fontWeight: 'bold' },
  itemSub: { color: '#888', fontSize: 12 },
  itemPrice: { fontSize: 18, color: '#2ecc71', fontWeight: 'bold' },
  itemStock: { color: '#666' },
  addButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  // Estilos del Modal
  modalBG: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 10, marginBottom: 10 },
  btn: { padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
