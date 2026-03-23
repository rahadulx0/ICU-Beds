import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import hospitalReducer from './hospitalSlice';
import ambulanceReducer from './ambulanceSlice';
import notificationReducer from './notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    hospitals: hospitalReducer,
    ambulance: ambulanceReducer,
    notifications: notificationReducer,
  },
});
