import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const createRequest = createAsyncThunk(
  'ambulance/createRequest',
  async (requestData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/ambulance/request', requestData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create request');
    }
  }
);

export const fetchRequests = createAsyncThunk(
  'ambulance/fetchRequests',
  async (params = {}, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams(params).toString();
      const { data } = await api.get(`/ambulance/requests?${query}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch requests');
    }
  }
);

export const fetchActiveRequest = createAsyncThunk(
  'ambulance/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/ambulance/active');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch active request');
    }
  }
);

export const acceptRequest = createAsyncThunk(
  'ambulance/accept',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/ambulance/${id}/accept`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept request');
    }
  }
);

export const updateRequestStatus = createAsyncThunk(
  'ambulance/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/ambulance/${id}/status`, { status });
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update status');
    }
  }
);

export const cancelRequest = createAsyncThunk(
  'ambulance/cancel',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/ambulance/${id}/cancel`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel request');
    }
  }
);

const ambulanceSlice = createSlice({
  name: 'ambulance',
  initialState: {
    requests: [],
    activeRequest: null,
    driverLocation: null,
    loading: false,
    error: null,
    pagination: null,
  },
  reducers: {
    setDriverLocation: (state, action) => {
      state.driverLocation = action.payload;
    },
    setActiveRequest: (state, action) => {
      state.activeRequest = action.payload;
    },
    clearActiveRequest: (state) => {
      state.activeRequest = null;
      state.driverLocation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.activeRequest = action.payload;
      })
      .addCase(createRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchRequests.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRequests.fulfilled, (state, action) => {
        state.requests = action.payload.requests;
        state.pagination = action.payload.pagination;
        state.loading = false;
      })
      .addCase(fetchRequests.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchActiveRequest.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActiveRequest.fulfilled, (state, action) => {
        state.activeRequest = action.payload;
        state.loading = false;
      })
      .addCase(fetchActiveRequest.rejected, (state) => {
        state.loading = false;
      })
      .addCase(acceptRequest.fulfilled, (state, action) => {
        state.activeRequest = action.payload;
        state.requests = state.requests.filter((r) => r._id !== action.payload._id);
      })
      .addCase(updateRequestStatus.fulfilled, (state, action) => {
        state.activeRequest = action.payload;
      })
      .addCase(cancelRequest.fulfilled, (state) => {
        state.activeRequest = null;
        state.driverLocation = null;
      });
  },
});

export const { setDriverLocation, setActiveRequest, clearActiveRequest } = ambulanceSlice.actions;
export default ambulanceSlice.reducer;
