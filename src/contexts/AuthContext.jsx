import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('icu-beds-token')
    if (!token) {
      setUser(null)
      setUserData(null)
      setLoading(false)
      return
    }
    try {
      const { user: data } = await api.get('/auth/me')
      setUser(data)
      setUserData(data)
    } catch {
      localStorage.removeItem('icu-beds-token')
      setUser(null)
      setUserData(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const login = async (email, password) => {
    const { token, user: data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('icu-beds-token', token)
    setUser(data)
    setUserData(data)
    return data
  }

  const signup = async (email, password, role = 'rep', displayName = '') => {
    const { token, user: data } = await api.post('/auth/signup', { email, password, role, displayName })
    localStorage.setItem('icu-beds-token', token)
    setUser(data)
    setUserData(data)
    return data
  }

  const getAdminCount = async () => {
    try {
      const { count } = await api.get('/auth/admin-count')
      return count
    } catch {
      return 0
    }
  }

  const updateProfile = async (data) => {
    const { user: updated } = await api.put('/auth/profile', data)
    setUser(updated)
    setUserData(updated)
  }

  const changePassword = async (currentPassword, newPassword) => {
    await api.put('/auth/password', { currentPassword, newPassword })
  }

  const deleteAccount = async (password) => {
    await api.delete('/auth/account', { password })
    localStorage.removeItem('icu-beds-token')
    setUser(null)
    setUserData(null)
  }

  const approveUser = async (id) => {
    await api.put(`/users/${id}/approve`)
  }

  const rejectUser = async (id) => {
    await api.delete(`/users/${id}`)
  }

  const logout = () => {
    localStorage.removeItem('icu-beds-token')
    setUser(null)
    setUserData(null)
  }

  const refreshUserData = () => fetchMe()

  return (
    <AuthContext.Provider value={{
      user, userData, loading,
      login, signup, logout,
      updateProfile, changePassword, deleteAccount,
      getAdminCount, refreshUserData,
      approveUser, rejectUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
