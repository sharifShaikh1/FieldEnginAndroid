import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Image, Alert, StatusBar } from 'react-native';
import ChatMessageBubble from '../components/ChatMessageBubble';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/apiConfig';

const TicketChatScreen = ({ route, navigation }) => {
  const { ticketId, chatTitle } = route.params;
  const socket = useSocket();
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!socket || !user || !ticketId) return;

    socket.emit('joinTicketRoom', ticketId, (response) => {
      if (response.success) {
        console.log(`Joined ticket room: ${ticketId}`);
        socket.emit('fetchMessages', { ticketId }, (res) => {
          if (res.messages) {
            setMessages(res.messages.reverse());
            setConversationId(res.conversationId);
            setLoading(false);
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToOffset({ offset: 0, animated: false });
              }
            }, 100);
          }
        });
      } else {
        console.error('Failed to join ticket room:', response.message);
        setLoading(false);
      }
    });

    const handleReceiveMessage = (message) => {
      setMessages((prevMessages) => {
        const existingIndex = prevMessages.findIndex(msg => msg.tempId === message.tempId);
        if (existingIndex > -1) {
          const updatedMessages = [...prevMessages];
          updatedMessages[existingIndex] = { ...message, tempId: undefined };
          return updatedMessages;
        } else {
          return [message, ...prevMessages];
        }
      });
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [socket, user, ticketId]);

  const fileToBase64 = async (uri) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      return base64;
    } catch (err) {
      console.error("Error converting file to base64:", err);
      throw new Error(`Failed to convert file to base64: ${err.message}`);
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled) {
        const validAssets = result.assets.filter(asset => {
          if (asset.size > 5 * 1024 * 1024) {
            Alert.alert("File Too Large", `File ${asset.name} exceeds the 5MB limit.`);
            return false;
          }
          return true;
        });

        if (validAssets.length > 0) {
          setSelectedFile(validAssets);
          setFilePreview(validAssets[0].uri);
        } else {
          setSelectedFile(null);
          setFilePreview(null);
        }
      }
    } catch (err) {
      console.error("Error picking document:", err);
      Alert.alert("Error", "Could not select file.");
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const sendMessage = useCallback(async () => {
    if (!socket || (!newMessage.trim() && (!selectedFile || selectedFile.length === 0))) return;

    const currentTimestamp = new Date().toISOString();
    const newGroupId = selectedFile && selectedFile.length > 1 ? Date.now().toString() : undefined;

    const messagesToSend = [];

    if (newMessage.trim()) {
      const tempId = Date.now().toString() + '_text';
      messagesToSend.push({
        _id: tempId,
        text: newMessage.trim(),
        senderId: { _id: user.id, fullName: user.fullName, role: user.role },
        timestamp: currentTimestamp,
        tempId: tempId,
        groupId: newGroupId,
      });
    }

    if (selectedFile && selectedFile.length > 0) {
      for (const file of selectedFile) {
        const tempId = Date.now().toString() + '_' + file.name;
        messagesToSend.push({
          _id: tempId,
          text: '',
          senderId: { _id: user.id, fullName: user.fullName, role: user.role },
          timestamp: currentTimestamp,
          tempId: tempId,
          fileKey: file.uri,
          fileType: file.mimeType,
          originalFileName: file.name,
          groupId: newGroupId,
        });
      }
    }

    setMessages((prevMessages) => [...messagesToSend, ...prevMessages]);

    setNewMessage('');
    setSelectedFile(null);
    setFilePreview(null);

    for (const msg of messagesToSend) {
      try {
        let fileData = null;
        if (msg.fileKey && !msg.fileKey.startsWith('http')) {
          fileData = await fileToBase64(msg.fileKey);
        }

        const messagePayload = {
          text: msg.text,
          ticketId: ticketId,
          fileData: fileData,
          fileType: msg.fileType,
          originalFileName: msg.originalFileName,
          tempId: msg.tempId,
          groupId: msg.groupId,
        };

        socket.emit('sendMessage', messagePayload, (response) => {
          if (response.success) {
            setMessages((prevMessages) =>
              prevMessages.map((m) =>
                m.tempId === msg.tempId ? { ...response.message, tempId: undefined } : m
              )
            );
          } else {
            console.error('Failed to send message:', response.message);
            setMessages((prevMessages) => prevMessages.filter((m) => m.tempId !== msg.tempId));
            Alert.alert("Send Error", "Could not send the message.");
          }
        });
      } catch (error) {
        console.error("Error processing file or sending message:", error);
        setMessages((prevMessages) => prevMessages.filter((m) => m.tempId !== msg.tempId));
        Alert.alert("Error", "Could not process the file for sending.");
      }
    }
  }, [socket, newMessage, selectedFile, ticketId, user]);

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId._id === user.id;
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 10,
      }}>
        <ChatMessageBubble
          msg={item}
          isMyMessage={isMyMessage}
          token={token}
          API_BASE_URL={API_BASE_URL}
          conversationId={conversationId}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ParticipantList', { ticketId: ticketId })} style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{chatTitle || 'Ticket Chat'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        inverted={true}
        style={{ flex: 1 }} // Add flex: 1 here
      />
      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={handleFileSelect} style={styles.attachButton}>
          <Ionicons name="attach" size={24} color="#555" />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingTop: Platform.OS === 'android' ? 40 : 50,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesContainer: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexGrow: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 120,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachButton: {
    padding: 8,
    marginRight: 5,
  },
});

export default TicketChatScreen;
