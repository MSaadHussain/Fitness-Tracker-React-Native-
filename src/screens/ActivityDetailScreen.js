
// src/screens/ActivityDetailScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { getActivities } from '../services/dbService';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import CustomModal from '../components/CustomModal';

const ActivityDetailScreen = ({ route }) => {
  const { activityId } = route.params;
  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    const fetchActivityDetails = async () => {
      try {
        setIsLoading(true);
        // getActivities can fetch by ID if provided, otherwise all
        const fetchedActivities = await getActivities(activityId);
        if (fetchedActivities && fetchedActivities.length > 0) {
            setActivity(fetchedActivities[0]);
        } else {
            setModalMessage('Activity not found.');
            setModalVisible(true);
        }
      } catch (error) {
        console.error('Error fetching activity details:', error);
        setModalMessage('Failed to load activity details.');
        setModalVisible(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityDetails();
  }, [activityId]); // Re-fetch when activityId changes

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${remainingSeconds}s`;
  };

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading activity details...</Text>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Activity not found or could not be loaded.</Text>
        <CustomModal
          isVisible={modalVisible}
          message={modalMessage}
          onClose={() => setModalVisible(false)}
        />
      </View>
    );
  }

  // Parse route coordinates from JSON string back to an array
  const routeCoordinates = activity.route ? JSON.parse(activity.route) : [];
  
  // Calculate initial region for the map based on route coordinates
  const initialRegion = routeCoordinates.length > 0 ? {
    latitude: routeCoordinates[0].latitude,
    longitude: routeCoordinates[0].longitude,
    latitudeDelta: 0.05, // Adjust zoom level as needed
    longitudeDelta: 0.05, // Adjust zoom level as needed
  } : null;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{activity.name || 'Unnamed Activity'}</Text>
      <View style={styles.detailCard}>
        <Text style={styles.detailText}>Date: {new Date(activity.date).toLocaleString()}</Text>
        <Text style={styles.detailText}>Duration: {formatDuration(activity.duration)}</Text>
        <Text style={styles.detailText}>Distance: {activity.distance.toFixed(2)} km</Text>
      </View>

      {activity.photoUri && (
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Activity Photo</Text>
          <Image source={{ uri: activity.photoUri }} style={styles.activityPhoto} />
        </View>
      )}

      {routeCoordinates.length > 0 && initialRegion && (
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Activity Route</Text>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT} // Use default provider to avoid Google Maps specific checks
            initialRegion={initialRegion}
            zoomEnabled={true}
            scrollEnabled={true}
          >
            {/* OSM Tile Layer */}
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
            />
            <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor="blue" />
            {/* Optional: Add markers for start and end points */}
            <Marker coordinate={routeCoordinates[0]} pinColor="green" title="Start" />
            <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} pinColor="red" title="End" />
          </MapView>
          {/* OSM Attribution is legally required */}
          <Text style={styles.osmAttribution}>Map data &copy; OpenStreetMap contributors</Text>
        </View>
      )}

      <CustomModal
        isVisible={modalVisible}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5FCFF',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  detailCard: {
    backgroundColor: '#E8F5E9', // Light green background
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A5D6A7', // Slightly darker green border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  detailText: {
    fontSize: 18,
    marginBottom: 8,
    color: '#333',
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  activityPhoto: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    resizeMode: 'cover',
    marginBottom: 15,
  },
  map: {
    height: 350,
    width: '100%',
    borderRadius: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#333',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  osmAttribution: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default ActivityDetailScreen;