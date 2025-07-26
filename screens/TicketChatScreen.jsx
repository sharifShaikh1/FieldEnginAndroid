import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Image, Alert } from 'react-native';
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
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!socket || !user || !ticketId) return;

    socket.emit('joinTicketRoom', ticketId, (response) => {
      if (response.success) {
        console.log(`Joined ticket room: ${ticketId}`);
        socket.emit('fetchMessages', { ticketId }, (res) => {
          if (res.messages) {
            setMessages(res.messages);
            setConversationId(res.conversationId);
            setLoading(false);
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: false });
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
      console.log('Received message from socket (full object):', JSON.stringify(message, null, 2));
      console.log('Received message from socket:', message);
      setMessages((prevMessages) => {
        const existingIndex = prevMessages.findIndex(msg => msg.tempId === message.tempId);
        if (existingIndex > -1) {
          const updatedMessages = [...prevMessages];
          updatedMessages[existingIndex] = { ...message, tempId: undefined };
          return updatedMessages;
        } else {
          return [...prevMessages, message];
        }
      });
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
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
      throw new Error(`Failed to convert file to base64: ${err.message}`);
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'], // Allow images and PDFs
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.size > 5 * 1024 * 1024) { // 5MB limit
          Alert.alert("File Too Large", "Maximum file size is 5MB.");
          return;
        }
        setSelectedFile(asset);
        setFilePreview(asset.uri);
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
    if (!socket || (!newMessage.trim() && !selectedFile)) return;

    let fileData = null;
    let fileType = null;
    let originalFileName = null;

    if (selectedFile) {
      try {
        fileData = await fileToBase64(selectedFile.uri);
        fileType = selectedFile.mimeType;
        originalFileName = selectedFile.name;
      } catch (error) {
        console.error("Error processing file:", error);
        Alert.alert("File Error", "Could not process selected file.");
        return;
      }
    }

    const messagePayload = {
      text: newMessage.trim(),
      ticketId: ticketId,
      fileData: fileData,
      fileType: fileType,
      originalFileName: originalFileName,
      tempId: Date.now().toString(),
    };

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        _id: messagePayload.tempId,
        text: messagePayload.text,
        senderId: { _id: user._id, fullName: user.fullName, role: user.role },
        timestamp: new Date().toISOString(),
        tempId: messagePayload.tempId,
        fileKey: selectedFile ? selectedFile.uri : null, // Use local URI for optimistic display
        fileType: selectedFile ? selectedFile.mimeType : null,
        originalFileName: selectedFile ? selectedFile.name : null,
      },
    ]);
    setNewMessage('');
    clearFile();

    socket.emit('sendMessage', messagePayload, (response) => {
      if (response.success) {
        // Update the optimistic message with the actual message from the backend
        setMessages((prevMessages) => prevMessages.map(msg =>
          msg.tempId === messagePayload.tempId ? { ...response.message, tempId: undefined } : msg
        ));
      } else {
        console.error('Failed to send message:', response.message);
        setMessages((prevMessages) => prevMessages.filter(msg => msg.tempId !== messagePayload.tempId));
      }
    });
  }, [socket, newMessage, selectedFile, ticketId, user]);

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId._id === user._id;
    return (
      <ChatMessageBubble
        msg={item}
        isMyMessage={isMyMessage}
        token={token}
        API_BASE_URL={API_BASE_URL}
        conversationId={conversationId}
      />
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{chatTitle || 'Ticket Chat'}</Text>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputContainer}>
        {selectedFile && (
          <View style={styles.filePreviewContainer}>
            {selectedFile.mimeType.startsWith('image/') ? (
              <Image source={{ uri: filePreview }} style={styles.filePreviewImage} />
            ) : (
              <View style={styles.filePreviewTextContainer}>
                <Ionicons name="document-text-outline" size={24} color="#333" />
                <Text style={styles.filePreviewText}>{selectedFile.name}</Text>
              </View>
            )}
            <TouchableOpacity onPress={clearFile} style={styles.clearFileButton}>
              <Ionicons name="close-circle" size={20} color="red" />
            </TouchableOpacity>
          </View>
        )}
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
  filePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    marginRight: 10,
  },
  filePreviewImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 8,
  },
  filePreviewTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  filePreviewText: {
    fontSize: 14,
    marginLeft: 5,
    flexShrink: 1,
  },
  clearFileButton: {
    marginLeft: 8,
    padding: 4,
  },
  attachButton: {
    padding: 8,
    marginRight: 5,
  },
});

export default TicketChatScreen;
