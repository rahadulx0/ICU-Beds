import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

export const fetchHospitals = createAsyncThunk(
  'hospitals/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/hospitals');
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch hospitals');
    }
  }
);

export const fetchNearbyHospitals = createAsyncThunk(
  'hospitals/fetchNearby',
  async ({ lng, lat, radius, beds }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ lng, lat });
      if (radius) params.set('radius', radius);
      if (beds) params.set('beds', 'true');
      const { data } = await api.get(`/hospitals/nearby?${params}`);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch nearby hospitals');
    }
  }
);

export const createHospital = createAsyncThunk(
  'hospitals/create',
  async (hospitalData, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/hospitals', hospitalData);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create hospital');
    }
  }
);

export const updateHospital = createAsyncThunk(
  'hospitals/update',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/hospitals/${id}`, updates);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update hospital');
    }
  }
);

export const updateBeds = createAsyncThunk(
  'hospitals/updateBeds',
  async ({ id, available_icu_beds, version }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/hospitals/${id}/beds`, {
        available_icu_beds,
        version,
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update bed count'
      );
    }
  }
);

export const deleteHospital = createAsyncThunk(
  'hospitals/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/hospitals/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete hospital');
    }
  }
);

const hospitalSlice = createSlice({
  name: 'hospitals',
  initialState: {
    list: [],
    selected: null,
    loading: false,
    error: null,
    filter: 'all', // all, available, critical
  },
  reducers: {
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    setSelected: (state, action) => {
      state.selected = action.payload;
    },
    updateBedCount: (state, action) => {
      const { hospitalId, available_icu_beds, total_icu_beds, version } = action.payload;
      const hospital = state.list.find((h) => h._id === hospitalId);
      if (hospital) {
        hospital.available_icu_beds = available_icu_beds;
        if (total_icu_beds !== undefined) hospital.total_icu_beds = total_icu_beds;
        if (version !== undefined) hospital.version = version;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHospitals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHospitals.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchHospitals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchNearbyHospitals.fulfilled, (state, action) => {
        state.list = action.payload;
        state.loading = false;
      })
      .addCase(createHospital.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateHospital.fulfilled, (state, action) => {
        const index = state.list.findIndex((h) => h._id === action.payload._id);
        if (index !== -1) state.list[index] = action.payload;
      })
      .addCase(updateBeds.fulfilled, (state, action) => {
        const index = state.list.findIndex((h) => h._id === action.payload._id);
        if (index !== -1) state.list[index] = action.payload;
      })
      .addCase(deleteHospital.fulfilled, (state, action) => {
        state.list = state.list.filter((h) => h._id !== action.payload);
      });
  },
});

export const { setFilter, setSelected, updateBedCount } = hospitalSlice.actions;
export default hospitalSlice.reducer;
