
// src/screens/NewActivityScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet, PermissionsAndroid, Platform, Image, ScrollView } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { saveActivity } from '../services/dbService';
import MapView, { Polyline, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps'; // PROVIDER_DEFAULT for generic map, UrlTile for OSM
import CustomModal from '../components/CustomModal';

const NewActivityScreen = ({ navigation }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [photoUri, setPhotoUri] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const watchId = useRef(null);
  const intervalId = useRef(null);
  const lastLocation = useRef(null);

  useEffect(() => {
    // Clean up interval and watch on unmount
    return () => {
      stopTracking(); // Ensure all tracking is stopped on component unmount
    };
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const status = await Geolocation.requestAuthorization('whenInUse');
      return status === 'granted';
    } else { // Android
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location to track activities.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'ios') {
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA, // Placeholder for iOS camera permission.
        {
          title: 'Camera Permission',
          message: 'This app needs camera access to take photos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return status === PermissionsAndroid.RESULTS.GRANTED;
    } else { // Android
      const cameraGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs camera access to take photos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (Platform.Version >= 33) {
          const readMediaImagesGranted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
              {
                  title: 'Media Images Permission',
                  message: 'This app needs access to your images.',
                  buttonNeutral: 'Ask Me Later',
                  buttonNegative: 'Cancel',
                  buttonPositive: 'OK',
              }
          );
          return cameraGranted === PermissionsAndroid.RESULTS.GRANTED && readMediaImagesGranted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
          const writeStorageGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
              title: 'Storage Permission',
              message: 'This app needs storage access to save photos.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          return cameraGranted === PermissionsAndroid.RESULTS.GRANTED && writeStorageGranted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
  };

  const startTracking = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setModalMessage('Location permission denied. Cannot start tracking.');
      setModalVisible(true);
      return;
    }

    setIsTracking(true);
    setRouteCoordinates([]);
    setDistance(0);
    setStartTime(Date.now());
    setDuration(0);
    lastLocation.current = null;

    watchId.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCoordinate = { latitude, longitude };

        setRouteCoordinates((prevCoords) => {
          const updatedCoords = [...prevCoords, newCoordinate];
          if (lastLocation.current) {
            const dist = calculateDistance(
              lastLocation.current.latitude,
              lastLocation.current.longitude,
              latitude,
              longitude
            );
            setDistance((prevDistance) => prevDistance + dist);
          }
          lastLocation.current = newCoordinate;
          return updatedCoords;
        });
        setCurrentLocation(newCoordinate);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setModalMessage(`Geolocation error: ${error.message}`);
        setModalVisible(true);
        stopTracking(); // Stop tracking on error
      },
      {
        enableHighAccuracy: true,
        interval: 5000, // Get updates every 5 seconds
        fastestInterval: 2000,
        distanceFilter: 10, // Update if location changes by 10 meters
      }
    );

    intervalId.current = setInterval(() => {
      setDuration((prevDuration) => prevDuration + 1);
    }, 1000); // Update duration every second
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (intervalId.current !== null) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
    setIsTracking(false);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  const handleFinishActivity = async () => {
    stopTracking();

    if (routeCoordinates.length === 0) {
      setModalMessage('No location data recorded for this activity. Please ensure location services are enabled.');
      setModalVisible(true);
      return;
    }

    // A simple prompt for activity name, can be replaced by a proper input field
    const activityName = `Activity on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;

    try {
      const newActivity = {
        name: activityName,
        date: new Date().toISOString(),
        duration: duration,
        distance: distance,
        route: JSON.stringify(routeCoordinates), // Store coordinates as JSON string
        photoUri: photoUri,
      };
      await saveActivity(newActivity);
      setModalMessage('Activity saved successfully!');
      setModalVisible(true);
      // Reset state for new activity
      setIsTracking(false);
      setCurrentLocation(null);
      setRouteCoordinates([]);
      setDistance(0);
      setStartTime(null);
      setDuration(0);
      setPhotoUri(null);
      navigation.goBack(); // Go back to Home screen after saving
    } catch (error) {
      console.error('Error saving activity:', error);
      setModalMessage('Failed to save activity. Please try again.');
      setModalVisible(true);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      setModalMessage('Camera or storage permission denied. Cannot take photo.');
      setModalVisible(true);
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 600,
      saveToPhotos: true, // Saves the photo to the device's gallery
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera picker');
      } else if (response.errorCode) {
        console.error('ImagePicker Error: ', response.errorMessage);
        setModalMessage(`Camera error: ${response.errorMessage}`);
        setModalVisible(true);
      } else if (response.assets && response.assets.length > 0) {
        setPhotoUri(response.assets[0].uri || null); // Ensure uri is string or null
      }
    });
  };

  const choosePhotoFromLibrary = async () => {
    const hasPermission = await requestCameraPermission(); // Using camera permission for storage too
    if (!hasPermission) {
      setModalMessage('Storage permission denied. Cannot access library.');
      setModalVisible(true);
      return;
    }

    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 600,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.error('ImagePicker Error: ', response.errorMessage);
        setModalMessage(`Image library error: ${response.errorMessage}`);
        setModalVisible(true);
      } else if (response.assets && response.assets.length > 0) {
        setPhotoUri(response.assets[0].uri || null); // Ensure uri is string or null
      }
    });
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{isTracking ? 'Tracking Activity...' : 'Start a New Activity'}</Text>

      <View style={styles.statsContainer}>
        <Text style={styles.statText}>Duration: {formatTime(duration)}</Text>
        <Text style={styles.statText}>Distance: {distance.toFixed(2)} km</Text>
        {currentLocation && (
          <Text style={styles.statText}>
            Current Location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {!isTracking ? (
          <Button title="Start Tracking" onPress={startTracking} color="#4CAF50" />
        ) : (
          <>
            <Button title="Stop Tracking" onPress={stopTracking} color="#FF9800" />
            <View style={{ marginTop: 10 }} />
            <Button title="Finish Activity & Save" onPress={handleFinishActivity} color="#2196F3" />
          </>
        )}
      </View>

      <View style={styles.photoSection}>
        <Text style={styles.sectionHeader}>Activity Photo</Text>
        {photoUri && <Image source={{ uri: photoUri }} style={styles.activityPhoto} />}
        <View style={styles.buttonContainer}>
          <Button title="Take Photo" onPress={takePhoto} color="#8BC34A" />
          <View style={{ marginTop: 10 }} />
          <Button title="Choose from Gallery" onPress={choosePhotoFromLibrary} color="#673AB7" />
        </View>
      </View>

      {/* MapView only renders if there are route coordinates and a current location */}
      {routeCoordinates.length > 0 && currentLocation && (
        <View style={styles.mapContainer}>
          <Text style={styles.sectionHeader}>Activity Route</Text>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT} // Use default provider to avoid Google Maps specific checks
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            region={{ // Keep map centered on current location while tracking
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
          >
            {/* OSM Tile Layer */}
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
            />
            <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor="blue" />
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
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  statsContainer: {
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
  statText: {
    fontSize: 18,
    marginBottom: 5,
    color: '#555',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  photoSection: {
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
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  activityPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
    resizeMode: 'cover',
  },
  mapContainer: {
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
  map: {
    height: 300,
    width: '100%',
    borderRadius: 10,
  },
  osmAttribution: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default NewActivityScreen;