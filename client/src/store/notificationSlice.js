import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async ({ page = 1 } = {}, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/notifications?page=${page}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      return data.count;
    } catch (error) {
      return rejectWithValue(0);
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/notifications/${id}/read`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.put('/notifications/read-all');
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    list: [],
    unreadCount: 0,
    loading: false,
    pagination: null,
  },
  reducers: {
    addNotification: (state, action) => {
      state.list.unshift(action.payload);
      state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const idx = state.list.findIndex((n) => n._id === action.payload._id);
        if (idx !== -1) state.list[idx].read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.list.forEach((n) => (n.read = true));
        state.unreadCount = 0;
      });
  },
});

export const { addNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
