import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, FlatList, Animated, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const flatListRef = useRef(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [keyboardHeight]);

  const onReplySwipe = useCallback((message) => {
    setReplyingToMessage(message);
  }, []);

  useEffect(() => {
    if (!socket || !user || !ticketId) return;

    socket.emit('joinTicketRoom', ticketId, (response) => {
      if (response.success) {
        socket.emit('fetchMessages', { ticketId }, (res) => {
          if (res.messages) {
            setMessages(res.messages.reverse());
            setConversationId(res.conversationId);
            setLoading(false);
            setTimeout(() => {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
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
        const index = prevMessages.findIndex(msg => msg.tempId === message.tempId);
        if (index > -1) {
          const updated = [...prevMessages];
          updated[index] = { ...message, tempId: undefined };
          return updated;
        }
        return [message, ...prevMessages];
      });
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    socket.on('receiveMessage', handleReceiveMessage);
    return () => socket.off('receiveMessage', handleReceiveMessage);
  }, [socket, user, ticketId]);

  const fileToBase64 = async (uri) => {
    try {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (err) {
      throw new Error(`Failed to convert file to base64: ${err.message}`);
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const validAssets = result.assets.filter(asset => {
          if (asset.size > 5 * 1024 * 1024) {
            Alert.alert("File Too Large", `${asset.name} exceeds the 5MB limit.`);
            return false;
          }
          return true;
        });

        if (validAssets.length > 0) {
          setSelectedFile(validAssets);
        } else {
          setSelectedFile(null);
        }
      }
    } catch (err) {
      Alert.alert("Error", "Could not select file.");
    }
  };

  const sendMessage = useCallback(async () => {
    if (!socket || (!newMessage.trim() && (!selectedFile || selectedFile.length === 0))) return;

    const timestamp = new Date().toISOString();
    const groupId = selectedFile?.length > 1 ? Date.now().toString() : undefined;

    const messagesToSend = [];

    if (newMessage.trim()) {
      const tempId = Date.now().toString() + '_text';
      messagesToSend.push({
        _id: tempId,
        text: newMessage.trim(),
        senderId: {
          _id: user._id,
          fullName: user.fullName,
          role: user.role
        },
        timestamp,
        tempId,
        groupId,
      });
    }

    if (selectedFile?.length > 0) {
      for (const file of selectedFile) {
        const tempId = Date.now().toString() + '_' + file.name;
        messagesToSend.push({
          _id: tempId,
          text: '',
          senderId: {
            _id: user._id,
            fullName: user.fullName,
            role: user.role
          },
          timestamp,
          tempId,
          fileKey: file.uri,
          fileType: file.mimeType,
          originalFileName: file.name,
          groupId,
        });
      }
    }

    setMessages((prev) => [...messagesToSend, ...prev]);
    setNewMessage('');
    setSelectedFile(null);

    for (const msg of messagesToSend) {
      try {
        let fileData = null;
        if (msg.fileKey && !msg.fileKey.startsWith('http')) {
          fileData = await fileToBase64(msg.fileKey);
        }

        const payload = {
          text: msg.text,
          ticketId,
          fileData,
          fileType: msg.fileType,
          originalFileName: msg.originalFileName,
          tempId: msg.tempId,
          groupId: msg.groupId,
          replyTo: replyingToMessage?._id,
        };

        socket.emit('sendMessage', payload, (response) => {
          if (response.success) {
            setMessages((prev) =>
              prev.map((m) =>
                m.tempId === msg.tempId ? { ...response.message, tempId: undefined } : m
              )
            );
            setReplyingToMessage(null);
          } else {
            setMessages((prev) => prev.filter((m) => m.tempId !== msg.tempId));
            Alert.alert("Send Error", "Could not send the message.");
          }
        });
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.tempId !== msg.tempId));
        Alert.alert("Error", "File sending failed.");
      }
    }
  }, [socket, newMessage, selectedFile, replyingToMessage]);

  const renderMessage = ({ item }) => {
    const isMine = item.senderId._id === user._id;
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        marginVertical: 4,
        paddingHorizontal: 10,
      }}>
        <ChatMessageBubble
          msg={item}
          isMyMessage={isMine}
          token={token}
          API_BASE_URL={API_BASE_URL}
          conversationId={conversationId}
          onReplySwipe={onReplySwipe}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading chat...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('ParticipantList', { ticketId })}
          style={styles.headerTitleContainer}
        >
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
        style={{ flex: 1 }}
      />

      <Animated.View style={{ paddingBottom: keyboardHeight }}>
        {replyingToMessage && (
          <View style={styles.replyPreviewContainer}>
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewHeader}>
                Replying to {replyingToMessage.senderId?.fullName || 'User'}
              </Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {replyingToMessage.text || (replyingToMessage.fileKey ? 'File' : '')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingToMessage(null)} style={styles.clearReplyButton}>
              <Ionicons name="close-circle" size={24} color="#555" />
            </TouchableOpacity>
          </View>
        )}

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
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: { marginRight: 10 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
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
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
    marginHorizontal: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  replyPreviewContent: {
    flex: 1,
    marginRight: 10,
  },
  replyPreviewHeader: {
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 2,
  },
  replyPreviewText: {
    color: '#555',
  },
  clearReplyButton: {
    padding: 5,
  },
});

export default TicketChatScreen;
