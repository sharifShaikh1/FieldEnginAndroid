import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '../config/apiConfig';



const RegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [governmentIdFile, setGovernmentIdFile] = useState(null);
  const [addressProofFile, setAddressProofFile] = useState(null)
  const [profilePicture, setProfilePicture] = useState(null);
  const [expertise, setExpertise] = useState([]);
  const [serviceAreas, setServiceAreas] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);


  const validateStep1 = () => {
    if (!fullName || fullName.length < 2) return 'Full Name must be at least 2 characters';
    if (!phoneNumber.match(/^\d{10}$/)) return 'Phone Number must be 10 digits';
    if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) return 'Invalid Email';
    if (!upiId.match(/^[a-zA-Z0-9.-]+@[a-zA-Z]+$/)) return 'Invalid UPI ID';
    if (!aadhaarFile) return 'Aadhaar file is required';
    if (!governmentIdFile) return ' Government ID  is required';
    if (!addressProofFile) return 'Address Proof is required';
    if (!profilePicture) return 'Profile Picture is required';
    if (expertise.length === 0) return 'Select at least one expertise';
    if (!serviceAreas) return 'Service Areas are required';
    return null;
  };

  const handleExpertiseChange = (value) => {
    setExpertise((prev) =>
      prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]
    );
  };

  const pickDocument = async (setFile) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'application/pdf'],
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType || (asset.name.endsWith('.pdf') ? 'application/pdf' : asset.name.endsWith('.png') ? 'image/png' : 'image/jpeg');
        setFile({ ...asset, mimeType });
        console.log(`Picked file: ${asset.name}, type: ${mimeType}`);
      } else {
        Alert.alert('Info', 'No file selected');
      }
    } catch (err) {
      Alert.alert('Error', `Failed to pick document: ${err.message}`);
      console.error('Document picker error:', err);
    }
  };

  const fileToBase64 = async (uri) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const mimeType = uri.endsWith('.pdf') ? 'application/pdf' : uri.endsWith('.png') ? 'image/png' : 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    } catch (err) {
      throw new Error(`Failed to convert file to base64: ${err.message}`);
    }
  };

  const handleNext = () => {
    const error = validateStep1();
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    setStep(2);
  };

  // In RegisterScreen.js

const handleRegister = async () => {
  if (!consent) {
    Alert.alert('Error', 'You must agree to the consent form');
    return;
  }

  setLoading(true);
  try {
  const aadhaarBase64 = await fileToBase64(aadhaarFile.uri);
  const governmentIdBase64 = await fileToBase64(governmentIdFile.uri);
  const addressProofBase64 = await fileToBase64(addressProofFile.uri);
  const profilePictureBase64 = await fileToBase64(profilePicture.uri);

    const data = {
      fullName,
      phoneNumber,
      email,
      upiId,
      expertise: expertise.join(','),
      serviceAreas,
      aadhaarFile: aadhaarBase64,
      governmentIdFile: governmentIdBase64,
      addressProofFile: addressProofBase64,
      profilePicture: profilePictureBase64
    };

    
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    // ✅ CORRECTED LOGIC: Check the 'ok' property on the original response object.
    if (!response.ok) {
      // If the server responded with an error status (4xx, 5xx), throw an error.
      throw new Error(responseData.message || 'Registration Failed');
    }

    // If we get here, it means response.ok was true (i.e., the registration was successful).
    setLoading(false);

    // ✅ CORRECTED SUCCESS ALERT: Use responseData to get the message and ID.
    Alert.alert(
      'Registration Submitted!',
      `${responseData.message}\nYour Employee ID: ${responseData.employeeId}`,
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    );

  } catch (err) {
    setLoading(false);
    // The catch block will now correctly handle only real errors.
    const errorMessage = err.message || 'An unknown error occurred';
    Alert.alert('Error', errorMessage);
    console.error('Registration error:', err);
  }
};

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: '#1F2937' }}>
      <View className="p-4">
        <Text className="text-2xl font-bold text-center text-white mb-4">Register</Text>

        {step === 1 && (
          <>
            <TextInput
              className="border border-gray-500 rounded-md p-3 mb-3 bg-gray-700 text-white"
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              className="border border-gray-500 rounded-md p-3 mb-3 bg-gray-700 text-white"
              placeholder="Phone Number (10 digits)"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="numeric"
              maxLength={10}
            />
            <TextInput
              className="border border-gray-500 rounded-md p-3 mb-3 bg-gray-700 text-white"
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              className="border border-gray-500 rounded-md p-3 mb-3 bg-gray-700 text-white"
              placeholder="UPI ID (e.g., name@bank)"
              placeholderTextColor="#9CA3AF"
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
            />
            <TouchableOpacity
              className="border border-gray-500 rounded-md p-3 mb-3 bg-gray-700"
              onPress={() => pickDocument(setAadhaarFile)}
            >
              <Text className="text-white">
                {aadhaarFile ? aadhaarFile.name : 'Upload Aadhaar (PNG/JPEG/PDF)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-gray-500 rounded-md p-3 mb-3 bg-gray-700"
              onPress={() => pickDocument(setGovernmentIdFile)}
            >
              <Text className="text-white">
                {governmentIdFile ? governmentIdFile.name : 'Upload Government Approved ID '}
              </Text>
            </TouchableOpacity>
             <TouchableOpacity
              className="border border-gray-500 rounded-md p-3 mb-3 bg-gray-700"
              onPress={() => pickDocument(setAddressProofFile)}
            >
              <Text className="text-white">
                {addressProofFile ? addressProofFile.name : 'Upload Adress Proof (electricity bill, etc.)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="border border-gray-500 rounded-md p-3 mb-3 bg-gray-700"
              onPress={() => pickDocument(setProfilePicture)}
            >
              <Text className="text-white">
                {profilePicture ? profilePicture.name : 'Upload Profile Picture (PNG/JPEG)'}
              </Text>
            </TouchableOpacity>
            <Text className="text-base font-semibold text-white mb-2">Expertise</Text>
            <View className="flex-row mb-3">
              <TouchableOpacity
                className={`flex-row items-center mr-4 ${expertise.includes('Networking') ? 'bg-blue-600' : 'bg-gray-600'} rounded-md p-2`}
                onPress={() => handleExpertiseChange('Networking')}
              >
                <Text className="text-white">Networking</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-row items-center ${expertise.includes('CCTV') ? 'bg-blue-600' : 'bg-gray-600'} rounded-md p-2`}
                onPress={() => handleExpertiseChange('CCTV')}
              >
                <Text className="text-white">CCTV</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              className="border border-gray-500 rounded-md p-3 mb-3 bg-gray-700 text-white"
              placeholder="Service Areas (comma-separated, e.g., Mumbai, Thane)"
              placeholderTextColor="#9CA3AF"
              value={serviceAreas}
              onChangeText={setServiceAreas}
            />

            <TouchableOpacity
              className="bg-blue-600 rounded-md p-3"
              onPress={handleNext}
            >
              <Text className="text-white text-center text-base font-semibold">Next</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
              <View className="mb-4">
                <Text className="text-base font-semibold text-white mb-2">Consent Form</Text>
                <Text className="text-sm text-gray-300 mb-2">
                  I agree that the company is not responsible for any physical harm during fieldwork. I consent to location tracking when accepting tickets to ensure site visits.
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => setConsent(!consent)}
                >
                  <View className={`w-5 h-5 border-2 border-gray-500 rounded mr-2 ${consent ? 'bg-blue-600' : 'bg-gray-700'}`} />
                  <Text className="text-white">I agree</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className={`rounded-md p-3 ${consent ? 'bg-blue-600' : 'bg-gray-600'}`}
                onPress={handleRegister}
                disabled={!consent || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-center text-base font-semibold">Submit Registration</Text>
                )}
              </TouchableOpacity>
            </>
        )}
      </View>
    </ScrollView>
  );
};

export default RegisterScreen;