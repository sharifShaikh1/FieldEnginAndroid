import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ImageViewer from './ImageViewer';

const ChatMessageBubble = ({ msg, isMyMessage, token, API_BASE_URL, conversationId }) => {
  const hasFile = !!msg.fileKey;
  const hasText = !!msg.text;
  const isOptimistic = !!msg.tempId && !msg._id;
  const isImageFile = hasFile && msg.fileType?.startsWith('image/');
  const isImageOnly = isImageFile && !hasText;
  const isPdfOrOtherFileOnly = hasFile && !hasText && !isImageFile;

  const [fileUri, setFileUri] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(hasFile && !isOptimistic);
  const [fileError, setFileError] = useState(false);
  const [isViewerVisible, setViewerVisible] = useState(false);
  const [fullImageUri, setFullImageUri] = useState(null);
  const [isLoadingFullImage, setIsLoadingFullImage] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isOptimistic && msg.fileKey && msg.fileKey.startsWith('file://')) {
      if (isMounted) {
        setFileUri(msg.fileKey);
        setIsLoadingFile(false);
      }
      return;
    }

    const fetchFile = async () => {
      if (!hasFile || !token || !conversationId || !msg.fileKey || msg.fileKey.startsWith('file://')) {
        setIsLoadingFile(false);
        return;
      }
      setIsLoadingFile(true);
      setFileError(false);
      const keyToFetch = isImageFile ? msg.thumbnailKey || msg.fileKey : msg.fileKey;
      const fileProxyUrl = `${API_BASE_URL}/api/files/${keyToFetch}?conversationId=${conversationId}`;
      try {
        const fileExtension = msg.originalFileName?.split('.').pop() || msg.fileType?.split('/')[1] || 'tmp';
        const localUri = `${FileSystem.cacheDirectory}${keyToFetch.replace(/[^a-zA-Z0-9.]/g, '_')}.${fileExtension}`;
        const downloadResult = await FileSystem.downloadAsync(fileProxyUrl, localUri, { headers: { 'Authorization': `Bearer ${token}` } });
        if (isMounted) {
          if (downloadResult.status === 200) {
            setFileUri(downloadResult.uri);
          } else {
            setFileError(true);
          }
        }
      } catch (error) {
        if (isMounted) setFileError(true);
      } finally {
        if (isMounted) setIsLoadingFile(false);
      }
    };
    fetchFile();
    return () => { isMounted = false; };
  }, [msg.fileKey, token, conversationId, isOptimistic]);

  const handleFilePress = async () => {
    if (isImageFile) {
      setViewerVisible(true);
    } else if (fileUri) {
      try {
        await Sharing.shareAsync(fileUri);
      } catch (error) {
        Alert.alert("Error", "Couldn't open or share the file.");
      }
    } else if (fileError) {
      Alert.alert("File Error", "Could not load this file.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isViewerVisible && isImageFile && !fullImageUri) {
      const fetchFullImage = async () => {
        setIsLoadingFullImage(true);
        try {
          const fullImageProxyUrl = `${API_BASE_URL}/api/files/${msg.fileKey}?conversationId=${conversationId}`;
          const localFullUri = `${FileSystem.cacheDirectory}full_${msg.fileKey.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const downloadResult = await FileSystem.downloadAsync(fullImageProxyUrl, localFullUri, { headers: { 'Authorization': `Bearer ${token}` } });
          if (isMounted && downloadResult.status === 200) {
            setFullImageUri(downloadResult.uri);
          }
        } catch (error) {
          // Handle error silently
        } finally {
          if (isMounted) setIsLoadingFullImage(false);
        }
      };
      fetchFullImage();
    }
    return () => { isMounted = false; };
  }, [isViewerVisible, msg.fileKey, token, conversationId]);

  const renderFileContent = () => {
    if (isLoadingFile) {
      return (
        <View style={styles.fileLoading}>
          <ActivityIndicator size="small" color="#333" />
          <Text style={styles.fileText}>Loading {msg.originalFileName || 'file'}...</Text>
        </View>
      );
    }
    if (fileError) {
      return (
        <View style={styles.fileError}>
          <Ionicons name="warning-outline" size={20} color="red" />
          <Text style={styles.fileErrorText}>Failed to load file</Text>
        </View>
      );
    }
    if (isImageFile) {
      return <Image source={{ uri: fileUri }} style={isImageOnly ? styles.imagePreview : styles.imagePreviewInBubble} resizeMode={isImageOnly ? "cover" : "contain"} />;
    }
    return (
      <View style={styles.fileIconContainer}>
        <Ionicons name="document-text-outline" size={24} color={'#333'} />
        <Text style={styles.fileText}>{msg.originalFileName || 'Document'}</Text>
      </View>
    );
  };

  return (
    <>
      <View style={[styles.bubbleContainer, isImageOnly ? {} : (isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble)]}>
        {isImageOnly ? (
          <TouchableOpacity onPress={handleFilePress} disabled={isLoadingFile || fileError}>
            {renderFileContent()}
            <View style={[styles.timestampOverlay, isMyMessage ? { right: 8 } : { left: 8 }]}>
              <Text style={styles.overlayTimestamp}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              {isOptimistic && <Ionicons name="time-outline" size={12} color={'#fff'} style={{ marginLeft: 4 }} />}
            </View>
          </TouchableOpacity>
        ) : (
          <>
            {!isMyMessage && <Text style={styles.senderName}>{msg.senderId?.fullName}</Text>}
            {hasFile && (
              <TouchableOpacity onPress={handleFilePress} disabled={isLoadingFile || fileError}>
                {renderFileContent()}
              </TouchableOpacity>
            )}
            {hasText && <Text style={styles.messageText}>{msg.text}</Text>}
            <View style={styles.bottomRow}>
              {isOptimistic && <Ionicons name="time-outline" size={12} color={'rgba(0,0,0,0.5)'} style={styles.optimisticIcon} />}
              <Text style={styles.timestamp}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </>
        )}
      </View>
      {isViewerVisible && (
        <ImageViewer
          visible={isViewerVisible}
          onClose={() => setViewerVisible(false)}
          imageUri={fullImageUri || fileUri}
          isLoading={isLoadingFullImage}
          senderName={msg.senderId?.fullName}
          timestamp={msg.timestamp}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    // Removed paddingHorizontal and borderRadius from here
  },
  messageBubble: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF', // Default for safety
  },
  myMessageBubble: {
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 2,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignSelf: 'flex-end', // Align the bubble itself
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignSelf: 'flex-start', // Align the bubble itself
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 0, // Reduced from 2
    fontWeight: 'bold',
    paddingHorizontal: 8, // Added padding
    flexShrink: 1, // Allow text to shrink
    numberOfLines: 1, // Limit to one line
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 8, // Keep this for text content
    paddingVertical: 1, // Reduced from 2
    marginTop: 0, // Removed margin top
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 0, // Reduced from 2
    paddingHorizontal: 8, // Keep this for timestamp alignment
    paddingBottom: 0, // Reduced from 2
  },
  timestamp: {
    fontSize: 9, // Smaller font size for timestamp
    color: 'rgba(0,0,0,0.5)',
    marginLeft: 4,
  },
  imagePreviewInBubble: {
    width: 220,
    height: 220,
    borderRadius: 8,
    margin: 4,
  },
  fileIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  fileText: {
    marginLeft: 8,
    fontSize: 14,
    flexShrink: 1,
    color: '#333',
  },
  fileLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    height: 60,
  },
  fileError: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#ffe0e0',
    borderRadius: 8,
  },
  fileErrorText: {
    marginLeft: 5,
    color: 'red',
    fontSize: 14,
  },
  imagePreview: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  imageOnlyContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 300, // Constrain image width
    backgroundColor: 'transparent', // Ensure no background
    borderWidth: 0, // Ensure no border
    alignSelf: 'flex-end', // Align the image itself
  },
  timestampOverlay: {
    position: 'absolute',
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayTimestamp: {
    color: '#fff',
    fontSize: 10,
  },
});

export default ChatMessageBubble;