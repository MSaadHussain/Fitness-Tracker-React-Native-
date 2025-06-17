// App.js
import 'react-native-gesture-handler'; // Required for react-navigation - KEEP THIS AS THE FIRST IMPORT
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import NewActivityScreen from './src/screens/NewActivityScreen';
import ActivityDetailScreen from './src/screens/ActivityDetailScreen';
import { initDb } from './src/services/dbService';
import CustomModal from './src/components/CustomModal';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createStackNavigator();

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    // Initialize the database when the app starts
    const initializeDatabase = async () => {
      try {
        await initDb();
        setIsDbReady(true);
        console.log('Database initialized successfully.');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setModalMessage('Failed to initialize database. Please restart the app.');
        setModalVisible(true);
      }
    };

    initializeDatabase();
  }, []); // Run only once on component mount

  if (!isDbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading database...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Fitness Tracker' }}
        />
        <Stack.Screen
          name="NewActivity"
          component={NewActivityScreen}
          options={{ title: 'New Activity' }}
        />
        <Stack.Screen
          name="ActivityDetail"
          component={ActivityDetailScreen}
          options={{ title: 'Activity Details' }}
        />
      </Stack.Navigator>

      <CustomModal
        isVisible={modalVisible}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#333',
  },
});
