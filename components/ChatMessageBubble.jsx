import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ImageViewer from './ImageViewer'; // Import the new component

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
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [isViewerVisible, setViewerVisible] = useState(false); // State for the modal

  useEffect(() => {
    let isMounted = true;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000; // 1 second

    const fetchFile = async (retryCount = 0) => {
      if (!hasFile || !token || !conversationId) {
        setIsLoadingFile(false);
        return;
      }

      if (isOptimistic && msg.fileKey.startsWith('file://')) {
        if (isMounted) {
          setFileUri(msg.fileKey);
          Image.getSize(msg.fileKey, (width, height) => {
            if (isMounted) setImageAspectRatio(width / height);
          }, () => { if (isMounted) setImageAspectRatio(1); });
          setIsLoadingFile(false);
        }
        return;
      }

      setIsLoadingFile(true);
      setFileError(false);
      const fileProxyUrl = `${API_BASE_URL}/api/files/${msg.fileKey}?conversationId=${conversationId}`;

      try {
        const fileExtension = msg.originalFileName?.split('.').pop() || msg.fileType?.split('/')[1] || 'tmp';
        const localUri = `${FileSystem.cacheDirectory}${msg.fileKey.replace(/[^a-zA-Z0-9.]/g, '_')}.${fileExtension}`;

        const downloadResult = await FileSystem.downloadAsync(fileProxyUrl, localUri, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (downloadResult.status === 200) {
          if (isMounted) {
            setFileUri(downloadResult.uri);
            Image.getSize(downloadResult.uri, (width, height) => {
              if (isMounted) setImageAspectRatio(width / height || 1);
            }, () => { if (isMounted) setImageAspectRatio(1); });
          }
        } else if (downloadResult.status === 404 && retryCount < MAX_RETRIES) {
          console.warn(`File not found (404) for ${msg.fileKey}, retrying... Attempt ${retryCount + 1}/${MAX_RETRIES}`);
          setTimeout(() => fetchFile(retryCount + 1), RETRY_DELAY_MS);
          return; // Exit to prevent finally block from running prematurely
        } else {
          throw new Error(`Download failed with status ${downloadResult.status}`);
        }
      } catch (error) {
        console.error('Error fetching file for mobile:', error);
        if (isMounted) setFileError(true);
      } finally {
        if (isMounted) setIsLoadingFile(false);
      }
    };

    fetchFile();

    return () => {
      isMounted = false;
    };
  }, [msg.fileKey, token, conversationId, API_BASE_URL, isOptimistic, hasFile, msg.fileType, msg.originalFileName]);

  const handleFilePress = async () => {
    if (isImageFile) {
      setViewerVisible(true); // Open the modal for images
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

  if (isImageOnly) {
    return (
      <>
        <View style={[styles.messageContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
          <TouchableOpacity onPress={handleFilePress} style={styles.imageOnlyContainer} disabled={isLoadingFile || fileError}>
            {isLoadingFile ? (
              <View style={[styles.imagePlaceholder, styles.centerContent]}>
                <ActivityIndicator size="large" color="#888" />
              </View>
            ) : fileError ? (
              <View style={[styles.imagePlaceholder, styles.centerContent, styles.fileError]}>
                <Ionicons name="warning-outline" size={30} color="red" />
                <Text style={styles.fileErrorText}>Load failed</Text>
              </View>
            ) : (
              <Image 
                source={{ uri: fileUri }} 
                style={[styles.imagePreview, { aspectRatio: imageAspectRatio }]} 
                resizeMode="cover" 
              />
            )}
            <View style={styles.timestampOverlay}>
              <Text style={styles.overlayTimestamp}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isOptimistic && <Ionicons name="time-outline" size={12} color={'#fff'} style={{ marginLeft: 4 }} />}
            </View>
          </TouchableOpacity>
        </View>
        {fileUri && (
          <ImageViewer 
            visible={isViewerVisible} 
            onClose={() => setViewerVisible(false)} 
            imageUri={fileUri}
            senderName={msg.senderId?.fullName}
            timestamp={msg.timestamp}
          />
        )}
      </>
    );
  }

  return (
    <>
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
      ]}>
        {isPdfOrOtherFileOnly ? (
          <TouchableOpacity onPress={handleFilePress} style={styles.fileContainer} disabled={isLoadingFile || fileError}>
            {isLoadingFile ? (
              <View style={styles.fileLoading}>
                <ActivityIndicator size="small" color={isMyMessage ? '#333' : '#333'} />
                <Text style={[styles.fileText, isMyMessage ? styles.myFileText : styles.otherFileText]}>
                  Loading {msg.originalFileName || 'file'}...
                </Text>
              </View>
            ) : fileError ? (
              <View style={styles.fileError}>
                <Ionicons name="warning-outline" size={20} color="red" />
                <Text style={styles.fileErrorText}>Failed to load file</Text>
              </View>
            ) : (
              <View style={styles.fileIconContainer}>
                <Ionicons name="document-text-outline" size={24} color={'#333'} />
                <Text style={[styles.fileText, isMyMessage ? styles.myFileText : styles.otherFileText]}>
                  {msg.originalFileName || 'Document'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}>
            {!isMyMessage && (
              <Text style={styles.senderName}>
              {msg.senderId?.fullName}
            </Text>
            )}

            {hasFile && (
              <TouchableOpacity onPress={handleFilePress} style={styles.fileContainer} disabled={isLoadingFile || fileError}>
                {isLoadingFile ? (
                  <View style={styles.fileLoading}>
                    <ActivityIndicator size="small" color={isMyMessage ? '#333' : '#333'} />
                    <Text style={[styles.fileText, isMyMessage ? styles.myFileText : styles.otherFileText]}>
                      Loading {msg.originalFileName || 'file'}...
                    </Text>
                  </View>
                ) : fileError ? (
                  <View style={styles.fileError}>
                    <Ionicons name="warning-outline" size={20} color="red" />
                    <Text style={styles.fileErrorText}>Failed to load file</Text>
                  </View>
                ) : (
                  <>
                    {isImageFile ? (
                      <Image
                        source={{ uri: fileUri }}
                        style={styles.imagePreviewInBubble}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.fileIconContainer}>
                        <Ionicons name="document-text-outline" size={24} color={'#333'} />
                        <Text style={[styles.fileText, isMyMessage ? styles.myFileText : styles.otherFileText]}>
                          {msg.originalFileName || 'Document'}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            )}

            {hasText && (
              <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                {msg.text}
              </Text>
            )}

            <View style={styles.bottomRow}>
              {isOptimistic && (
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={'rgba(0,0,0,0.5)'}
                  style={styles.optimisticIcon}
                />
              )}
              <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.otherTimestamp]}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}
      </View>
      {fileUri && isImageFile && (
        <ImageViewer 
          visible={isViewerVisible} 
          onClose={() => setViewerVisible(false)} 
          imageUri={fileUri}
          senderName={msg.senderId?.fullName}
          timestamp={msg.timestamp}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 0,
    paddingHorizontal: 10,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    padding: 4,
    borderRadius: 12,
    maxWidth: '80%',
  },
  myMessageBubble: {
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 2,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    marginTop: 0,
  },
  myMessageText: {
    color: '#333',
  },
  otherMessageText: {
    color: '#333',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 1,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.5)',
  },
  myTimestamp: {},
  otherTimestamp: {},
  optimisticIcon: {
    marginRight: 4,
  },
  fileContainer: {
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreviewInBubble: {
    width: 200,
    height: 150,
    borderRadius: 8,
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
  myFileText: {},
  otherFileText: {},
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
  // Styles for image-only messages
  imageOnlyContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 250, // Set a width for the container
  },
  imagePreview: {
    width: '100%',
    // height is determined by aspectRatio
  },
  imagePlaceholder: {
    width: 250,
    height: 200,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timestampOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 8,
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