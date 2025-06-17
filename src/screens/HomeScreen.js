
// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Button, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getActivities } from '../services/dbService';
import CustomModal from '../components/CustomModal';

const HomeScreen = ({ navigation }) => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const fetchedActivities = await getActivities();
      // Sort activities by date in descending order
      fetchedActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
      setActivities(fetchedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setModalMessage('Failed to load activities. Please try again.');
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchActivities();
    }, [])
  );

  const renderActivityItem = ({ item }) => (
    <TouchableOpacity
      style={styles.activityItem}
      onPress={() => navigation.navigate('ActivityDetail', { activityId: item.id })}
    >
      <Text style={styles.activityTitle}>{item.name || 'Unnamed Activity'}</Text>
      <Text style={styles.activityDate}>{new Date(item.date).toLocaleString()}</Text>
      <Text style={styles.activityDuration}>Duration: {formatDuration(item.duration)}</Text>
      <Text style={styles.activityDistance}>Distance: {item.distance.toFixed(2)} km</Text>
    </TouchableOpacity>
  );

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
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Button
        title="Start New Activity"
        onPress={() => navigation.navigate('NewActivity')}
        color="#4CAF50"
      />
      <Text style={styles.header}>Past Activities</Text>
      {activities.length === 0 ? (
        <Text style={styles.noActivitiesText}>No activities recorded yet.</Text>
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderActivityItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <CustomModal
        isVisible={modalVisible}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </View>
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
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center',
    color: '#333',
  },
  activityItem: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  activityDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  activityDuration: {
    fontSize: 14,
    color: '#666',
  },
  activityDistance: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  noActivitiesText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#333',
  },
});

export default HomeScreen;