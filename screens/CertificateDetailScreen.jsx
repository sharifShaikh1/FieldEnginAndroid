import React from 'react';
import { View, SafeAreaView, Image, StyleSheet } from 'react-native';

const CertificateDetailScreen = ({ route }) => {
  const { uri } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image: {
    flex: 1,
    width: undefined,
    height: undefined,
  },
});

export default CertificateDetailScreen;
