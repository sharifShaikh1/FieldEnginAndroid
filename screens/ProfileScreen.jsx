import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, Button, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api'; // Import the api instance
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const ProfileScreen = ({ navigation }) => {
  console.log('ProfileScreen component rendered.');
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  const handleAddCertificate = async () => {
    console.log('handleAddCertificate: Function started.');
    if (uploading) {
      return;
    }

    const certificateName = "TestCertificate"; // Temporarily hardcode for testing

    try {
      setUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'application/pdf'],
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      const fileDetails = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType,
      };

      if (!fileDetails) {
        Alert.alert('Error', 'Could not read file data.');
        setUploading(false);
        return;
      }

      const certificateBase64 = await fileToBase64(fileDetails.uri);

      const certificateData = {
        name: certificateName,
        issuedAt: new Date().toISOString(),
        certificate: certificateBase64,
      };

      const uploadResponse = await api.post('/auth/certificates', certificateData);

      Alert.alert('Success', uploadResponse.data.message);
      fetchProfile(); // Refresh profile to show new certificate

    } catch (uploadError) {
      console.error('Error adding certificate:', uploadError.response?.data || uploadError.message);
      Alert.alert('Upload Error', uploadError.response?.data?.message || 'Failed to add certificate.');
    } finally {
      setUploading(false);
    }
  };

  const renderSection = (title, children) => (
    <View className="bg-white p-4 rounded-lg shadow-md mb-4 w-full">
      <Text className="text-xl font-bold text-gray-800 mb-3">{title}</Text>
      {children}
    </View>
  );

  const renderDetail = (label, value) => (
    <View className="flex-row justify-between py-2 border-b border-gray-200 last:border-b-0">
      <Text className="text-gray-600 font-medium">{label}:</Text>
      <Text className="text-gray-800 flex-1 text-right ml-2">{value || 'N/A'}</Text>
    </View>
  );

  const renderDocumentLink = (label, url) => {
    if (!url) return null;
    return (
      <View className="flex-row justify-between py-2 border-b border-gray-200 last:border-b-0">
        <Text className="text-gray-600 font-medium">{label}:</Text>
        <TouchableOpacity onPress={() => Linking.openURL(url)}>
          <Text className="text-blue-600 underline">View Document</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCertificate = (certificate, index) => (
    <View key={index} className="py-2 border-b border-gray-200 last:border-b-0">
      <Text className="text-gray-800 font-medium">{certificate.name}</Text>
      {certificate.issuedAt && (
        <Text className="text-gray-600 text-sm">Issued: {new Date(certificate.issuedAt).toLocaleDateString()}</Text>
      )}
      <TouchableOpacity onPress={() => Linking.openURL(certificate.url)}>
        <Text className="text-blue-600 underline text-sm">View Certificate</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="mt-4 text-gray-600">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-red-500 text-lg">{error}</Text>
        <View className="mt-4 w-4/5">
          <Button title="Retry" onPress={() => fetchProfile()} color="#4F46E5" />
        </View>
        <View className="mt-4 w-4/5">
          <Button title="Logout" onPress={handleLogout} color="#D32F2F" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-gray-600 text-lg">No profile data available.</Text>
        <View className="mt-4 w-4/5">
          <Button title="Logout" onPress={handleLogout} color="#D32F2F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView className="p-4">
        <Text className="text-3xl font-bold text-center text-gray-900 mb-6">My Profile</Text>

        {renderSection('Personal Details', (
          <>
            {renderDetail('Full Name', profile.fullName)}
            {renderDetail('Email', profile.email)}
            {renderDetail('Role', profile.role)}
            {renderDetail('Status', profile.status)}
            {profile.employeeId && renderDetail('Employee ID', profile.employeeId)}
          </>
        ))}

        {(profile.phoneNumber || profile.upiId) && renderSection('Contact Information', (
          <>
            {profile.phoneNumber && renderDetail('Phone Number', profile.phoneNumber)}
            {profile.upiId && renderDetail('UPI ID', profile.upiId)}
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

        {renderSection('Certificates', (
          <View>
            <TouchableOpacity
              className="bg-indigo-600 rounded-lg p-3 mt-4 flex-row items-center justify-center"
              onPress={() => navigation.navigate('Certificates', { certificates: profile.certificates })}
            >
              <Text className="text-white text-center text-base font-bold">View Certificates</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View className="mt-6 mb-10 w-full">
          <Button title="Logout" onPress={handleLogout} color="#D32F2F" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
