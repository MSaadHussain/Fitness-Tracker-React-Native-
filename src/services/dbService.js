
// src/services/dbService.js
import { openDatabase } from 'react-native-sqlite-storage';

let db = null;

const DB_NAME = 'fitness_tracker.db';
const TABLE_NAME = 'activities';

// Function to initialize the database and create the table
export const initDb = () => {
  return new Promise((resolve, reject) => {
    db = openDatabase(
      {
        name: DB_NAME,
        location: 'default', // Location where the database file will be stored (e.g., app documents directory)
      },
      () => {
        console.log('Database opened successfully');
        // Create table if it doesn't exist
        if (db) { // Check if db is not null after successful open
          db.transaction((tx) => {
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                date TEXT NOT NULL,
                duration INTEGER NOT NULL,
                distance REAL NOT NULL,
                route TEXT,
                photoUri TEXT
              );`,
              [],
              () => {
                console.log('Table created or already exists');
                resolve();
              },
              (error) => {
                console.error('Error creating table:', error);
                reject(error);
              }
            );
          });
        } else {
          reject(new Error('Database failed to open.'));
        }
      },
      (error) => {
        console.error('Error opening database:', error);
        reject(error);
      }
    );
  });
};

// Function to save a new activity
export const saveActivity = (activity) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized. Call initDb first.'));
      return;
    }
    db.transaction((tx) => {
      tx.executeSql(
        `INSERT INTO ${TABLE_NAME} (name, date, duration, distance, route, photoUri) VALUES (?, ?, ?, ?, ?, ?);`,
        [activity.name, activity.date, activity.duration, activity.distance, activity.route, activity.photoUri],
        (tx, results) => {
          if (results.rowsAffected > 0) {
            console.log('Activity saved successfully:', activity);
            resolve(results.insertId); // Return the ID of the new row
          } else {
            reject(new Error('Failed to save activity.'));
          }
        },
        (error) => {
          console.error('Error saving activity:', error);
          reject(error);
        }
      );
    });
  });
};

// Function to get all activities or a specific activity by ID
export const getActivities = (activityId = null) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized. Call initDb first.'));
      return;
    }
    db.transaction((tx) => {
      let query = `SELECT * FROM ${TABLE_NAME}`;
      const params = [];
      if (activityId !== null) { // Use strict check for null
        query += ` WHERE id = ?`;
        params.push(activityId);
      }
      query += ` ORDER BY date DESC;`; // Order by date descending by default

      tx.executeSql(
        query,
        params,
        (tx, results) => {
          const activities = [];
          for (let i = 0; i < results.rows.length; i++) {
            activities.push(results.rows.item(i));
          }
          resolve(activities);
        },
        (error) => {
          console.error('Error getting activities:', error);
          reject(error);
        }
      );
    });
  });
};

// Function to delete an activity (optional, but good for completeness)
export const deleteActivity = (id) => {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized. Call initDb first.'));
        return;
      }
      db.transaction((tx) => {
        tx.executeSql(
          `DELETE FROM ${TABLE_NAME} WHERE id = ?;`,
          [id],
          (tx, results) => {
            if (results.rowsAffected > 0) {
              console.log('Activity deleted successfully:', id);
              resolve(true);
            } else {
              reject(new Error('Failed to delete activity.'));
            }
          },
          (error) => {
            console.error('Error deleting activity:', error);
            reject(error);
          }
        );
      });
    });
};