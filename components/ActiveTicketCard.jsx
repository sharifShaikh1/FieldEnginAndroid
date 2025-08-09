// components/ActiveTicketCard.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../utils/api';

const ActiveTicketCard = ({ ticket, onUpdate }) => {
  const navigation = useNavigation();
  const [holdModalVisible, setHoldModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [releaseModalVisible, setReleaseModalVisible] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [closeRemarks, setCloseRemarks] = useState('');

  const handleHold = async () => {
    if (!holdReason) {
      Alert.alert('Error', 'Please provide a reason for putting the ticket on hold.');
      return;
    }
    try {
      await api.put(`/tickets/${ticket._id}/hold`, { reason: holdReason });
      setHoldModalVisible(false);
      onUpdate();
    } catch (error) {
      console.error('Error putting ticket on hold:', error);
      Alert.alert('Error', 'Failed to put ticket on hold.');
    }
  };

  const handleClose = async () => {
    if (!closeRemarks) {
      Alert.alert('Error', 'Please provide closing remarks.');
      return;
    }
    try {
      await api.put(`/tickets/${ticket._id}/close`, { remarks: closeRemarks });
      setCloseModalVisible(false);
      onUpdate();
    } catch (error) {
      console.error('Error closing ticket:', error);
      Alert.alert('Error', 'Failed to close ticket.');
    }
  };

  const handleRelease = async () => {
    try {
      await api.put(`/tickets/${ticket._id}/release`);
      setReleaseModalVisible(false);
      onUpdate();
    } catch (error) {
      console.error('Error releasing ticket:', error);
      Alert.alert('Error', 'Failed to release ticket.');
    }
  };

  const handleUnhold = async () => {
    try {
      await api.put(`/tickets/${ticket._id}/unhold`);
      onUpdate();
    } catch (error) {
      console.error('Error unholding ticket:', error);
      Alert.alert('Error', 'Failed to unhold ticket.');
    }
  };


  if (!ticket) {
    return (
        <View className="p-5 bg-green-100 rounded-2xl items-center justify-center">
            <Ionicons name="checkmark-done-circle" size={32} color="green" />
            <Text className="text-lg font-bold text-green-800 mt-2">No active tickets!</Text>
            <Text className="text-gray-600">You're all caught up.</Text>
        </View>
    );
  }

  return (
    <View className="bg-white p-4 rounded-2xl shadow-md border border-gray-200">
      <Modal
        animationType="slide"
        transparent={true}
        visible={holdModalVisible}
        onRequestClose={() => setHoldModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Hold Ticket</Text>
            <TextInput
              placeholder="Reason for Putting on hold"
              onChangeText={setHoldReason}
              value={holdReason}
              style={{ borderWidth: 1, borderColor: 'gray', borderRadius: 5, padding: 10, marginBottom: 10 }}
            />
            <TouchableOpacity onPress={handleHold} style={{ backgroundColor: 'yellow', padding: 10, borderRadius: 5, alignItems: 'center' }}>
              <Text>Hold</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setHoldModalVisible(false)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={closeModalVisible}
        onRequestClose={() => setCloseModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Close Ticket</Text>
            <TextInput
              placeholder="Closing remarks"
              onChangeText={setCloseRemarks}
              value={closeRemarks}
              style={{ borderWidth: 1, borderColor: 'gray', borderRadius: 5, padding: 10, marginBottom: 10 }}
            />
            <TouchableOpacity onPress={handleClose} style={{ backgroundColor: 'red', padding: 10, borderRadius: 5, alignItems: 'center' }}>
              <Text style={{ color: 'white' }}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCloseModalVisible(false)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={releaseModalVisible}
        onRequestClose={() => setReleaseModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10, width: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Release Ticket</Text>
            <Text>Are you sure you want to release this ticket?</Text>
            <TouchableOpacity onPress={handleRelease} style={{ backgroundColor: 'gray', padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 10 }}>
              <Text style={{ color: 'white' }}>Release</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReleaseModalVisible(false)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-sm font-bold text-indigo-600">{ticket.ticketId}</Text>
          <Text className="text-lg font-bold text-gray-800 mt-1">{ticket.companyName}</Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="location-sharp" size={16} color="gray" />
            <Text className="text-gray-600 ml-1 flex-shrink">{ticket.siteAddress}</Text>
          </View>
        </View>
        <View className="bg-yellow-100 px-3 py-1 rounded-full ml-2">
            <Text className="text-yellow-800 font-bold text-xs">{ticket.status}</Text>
        </View>
      </View>
      <View className="border-t border-gray-100 my-3" />
      <Text className="text-sm text-gray-700 leading-5">{ticket.workDescription}</Text>
      <View className="flex-row justify-between mt-4">
        {ticket.status === 'On-Hold' ? (
          <TouchableOpacity onPress={handleUnhold} className="bg-green-500 flex-1 p-3 rounded-lg items-center justify-center flex-row mr-2">
            <Ionicons name="play-circle" size={20} color="white" />
            <Text className="text-white font-bold text-sm ml-2">Unhold</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setHoldModalVisible(true)} className="bg-yellow-500 flex-1 p-3 rounded-lg items-center justify-center flex-row mr-2">
            <Ionicons name="pause-circle" size={20} color="white" />
            <Text className="text-white font-bold text-sm ml-2">Hold</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setCloseModalVisible(true)} className="bg-red-500 flex-1 p-3 rounded-lg items-center justify-center flex-row mr-2">
          <Ionicons name="close-circle" size={20} color="white" />
          <Text className="text-white font-bold text-sm ml-2">Close</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setReleaseModalVisible(true)} className="bg-gray-500 flex-1 p-3 rounded-lg items-center justify-center flex-row">
          <Ionicons name="arrow-undo-circle" size={20} color="white" />
          <Text className="text-white font-bold text-sm ml-2">Release</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row justify-between mt-4">
        <TouchableOpacity className="bg-indigo-600 flex-1 p-3 rounded-lg items-center justify-center flex-row mr-2">
          <Ionicons name="arrow-forward-circle" size={20} color="white" />
          <Text className="text-white font-bold text-sm ml-2">View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-blue-500 p-3 rounded-lg items-center justify-center flex-row ml-2"
          onPress={() => navigation.navigate('TicketChat', { ticketId: ticket._id, chatTitle: `Ticket ${ticket.ticketId}` })}
        >
          <Ionicons name="chatbubbles" size={20} color="white" />
          <Text className="text-white font-bold text-sm ml-2">Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ActiveTicketCard;