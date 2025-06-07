import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapLibreGL from 'maplibre-react-native';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapLibreGL.MapView style={styles.map} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 }
});
