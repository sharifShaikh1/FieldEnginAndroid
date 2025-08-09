import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, Button, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert, Platform, Modal, TextInput, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api'; // Import the api instance
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons
import * as ScreenCapture from 'expo-screen-capture';
import { usePreventScreenCapture } from 'expo-screen-capture';
import IdCard from '../components/IdCard';

const ProfileScreen = ({ navigation }) => {
  usePreventScreenCapture();
  console.log('ProfileScreen component rendered.');
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isUpiModalVisible, setUpiModalVisible] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [isIdCardVisible, setIsIdCardVisible] = useState(false);

  const fileToBase64 = async (uri) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const mimeType = uri.endsWith('.pdf') ? 'application/pdf' : uri.endsWith('.png') ? 'image/png' : 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    } catch (err) {
      throw new Error(`Failed to convert file to base64: ${err.message}`);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      setProfile(response.data);
      setNewUpiId(response.data.upiId || ''); // Initialize with current UPI ID
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile. Please try again.');
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [logout]);

  const handleLogout = async () => {
    logout();
  };

  const handleUpdateUpiId = async () => {
    if (!newUpiId.trim()) {
        Alert.alert('Invalid Input', 'UPI ID cannot be empty.');
        return;
    }
    if (!/^[a-zA-Z0-9.-]+@[a-zA-Z]+$/.test(newUpiId)) {
        Alert.alert('Invalid Format', 'Please enter a valid UPI ID format (e.g., yourname@bank).');
        return;
    }

    try {
        const response = await api.put('/auth/me/upi', { upiId: newUpiId });
        Alert.alert('Success', response.data.message);
        setProfile(prev => ({ ...prev, upiId: newUpiId }));
        setUpiModalVisible(false);
    } catch (err) {
        Alert.alert('Update Failed', err.response?.data?.message || 'An error occurred.');
    }
  };

  const renderSection = (title, children) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderDetail = (label, value, onEdit) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">{value || 'N/A'}</Text>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <Ionicons name="pencil" size={18} color="#4F46E5" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDocumentLink = (label, url) => {
    if (!url) return null;
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}:</Text>
        <TouchableOpacity onPress={() => Linking.openURL(url)}>
          <Text style={styles.documentLink}>View Document</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.buttonContainer}>
          <Button title="Retry" onPress={() => fetchProfile()} color="#4F46E5" />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Logout" onPress={handleLogout} color="#D32F2F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <Text style={styles.infoText}>No profile data available.</Text>
        <View style={styles.buttonContainer}>
          <Button title="Logout" onPress={handleLogout} color="#D32F2F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerTitle}>My Profile</Text>

        {renderSection('Personal Details', (
          <>
            {renderDetail('Full Name', profile.fullName)}
            {renderDetail('Email', profile.email)}
            {renderDetail('Role', profile.role)}
            {renderDetail('Status', profile.status)}
            {profile.employeeId && renderDetail('Employee ID', profile.employeeId)}
          </>
        ))}

        {renderSection('Contact Information', (
          <>
            {profile.phoneNumber && renderDetail('Phone Number', profile.phoneNumber)}
            {renderDetail('UPI ID', profile.upiId, () => setUpiModalVisible(true))}
          </>
        ))}

        {(profile.expertise?.length > 0 || profile.serviceAreas?.length > 0) && renderSection('Professional Details', (
          <>
            {profile.expertise?.length > 0 && renderDetail('Expertise', profile.expertise.join(', '))}
            {profile.serviceAreas?.length > 0 && renderDetail('Service Areas', profile.serviceAreas.join(', '))}
          </>
        ))}

        {profile.documents && (profile.documents.aadhaar || profile.documents.governmentId || profile.documents.addressProof) && renderSection('Documents', (
          <>
            {renderDocumentLink('Aadhaar', profile.documents.aadhaar)}
            {renderDocumentLink('Government ID', profile.documents.governmentId)}
            {renderDocumentLink('Address Proof', profile.documents.addressProof)}
          </>
        ))}

        {renderSection('Identity', (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => setIsIdCardVisible(true)}
          >
            <Text style={styles.manageButtonText}>View ID Card</Text>
          </TouchableOpacity>
        ))}

        {renderSection('Certificates', (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => navigation.navigate('Certificates', { certificates: profile.certificates })}
          >
            <Text style={styles.manageButtonText}>View & Manage Certificates</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.logoutButtonContainer}>
          <Button title="Logout" onPress={handleLogout} color="#D32F2F" />
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isUpiModalVisible}
          onRequestClose={() => setUpiModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit UPI ID</Text>
              <TextInput
                style={styles.input}
                onChangeText={setNewUpiId}
                value={newUpiId}
                placeholder="Enter new UPI ID"
                autoCapitalize="none"
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setUpiModalVisible(false)}>
                    <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateUpiId}>
                    <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isIdCardVisible}
          onRequestClose={() => setIsIdCardVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setIsIdCardVisible(false)}
          >
            <View style={styles.modalContent}>
              <IdCard user={profile} />
            </View>
          </TouchableOpacity>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f0f2f5' },
    scrollContainer: { padding: 16 },
    centeredScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' },
    headerTitle: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#1f2937', marginBottom: 24 },
    sectionContainer: { backgroundColor: 'white', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '600', color: '#374151', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    detailLabel: { color: '#6b7280', fontSize: 16, fontWeight: '500' },
    detailValue: { color: '#1f2937', fontSize: 16, flex: 1, textAlign: 'right', marginLeft: 12 },
    editButton: { marginLeft: 12, padding: 4 },
    documentLink: { color: '#4F46E5', textDecorationLine: 'underline' },
    manageButton: { backgroundColor: '#4F46E5', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    manageButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    logoutButtonContainer: { marginTop: 24, marginBottom: 48 },
    loadingText: { marginTop: 12, color: '#6b7280' },
    errorText: { color: '#ef4444', fontSize: 18 },
    infoText: { color: '#6b7280', fontSize: 18 },
    buttonContainer: { marginTop: 16, width: '80%' },
    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between' },
    modalButton: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginHorizontal: 5 },
    cancelButton: { backgroundColor: '#6b7280' },
    saveButton: { backgroundColor: '#4F46E5' },
    modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;
