import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { getStoredUser, storeUser, clearUser } from '../services/userService';

export default function Home() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('Junior Developer');
  const [modalVisible, setModalVisible] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [nameInputModalVisible, setNameInputModalVisible] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const user = await getStoredUser();
    if (user.userName && user.userId) {
      setUserName(user.userName);
      setUserId(user.userId);
    } else {
      setNameInputModalVisible(true);
    }
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    const user = await storeUser(tempName.trim());
    if (user) {
      setUserName(user.userName);
      setUserId(user.userId);
      setNameInputModalVisible(false);
      setTempName(''); // Clear for next time
    }
  };

  const handleLogout = async () => {
    await clearUser();
    setUserName(null);
    setUserId(null);
    setTempName('');
    setNameInputModalVisible(true);
  };

  const roles = [
    'Junior Developer',
    'Senior Developer',
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'DevOps Engineer',
    'Data Scientist',
    'Product Manager',
  ];

  const handleStartInterview = () => {
    router.push({ pathname: "/chat", params: { role: selectedRole } });
  };

  const handleSelectRole = (role: string) => {
    setSelectedRole(role);
    setModalVisible(false);
  };

  return (
    <ExpoLinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.contentCard}>
        {userName && (
          <Text style={styles.welcomeText}>Welcome, {userName}!</Text>
        )}
        <Text style={styles.title}>Ready for your interview?</Text>
        <Text style={styles.subtitle}>Let's ace this together</Text>

        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Select Your Role</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>{selectedRole}</Text>
            <View style={styles.dropdownIconContainer}>
              <Text style={styles.dropdownArrow}>▼</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartInterview}
          activeOpacity={0.8}
        >
          <ExpoLinearGradient
            colors={['#f093fb', '#f5576c']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.startButtonText}>Start Interview</Text>
          </ExpoLinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push('/history')}
          activeOpacity={0.7}
        >
          <Text style={styles.historyButtonText}>View History</Text>
        </TouchableOpacity>

        {userName && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Switch User</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Your Role</Text>
            <FlatList
              data={roles}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.roleItem,
                    item === selectedRole && styles.selectedRoleItem
                  ]}
                  onPress={() => handleSelectRole(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.roleText,
                    item === selectedRole && styles.selectedRoleText
                  ]}>
                    {item}
                  </Text>
                  {item === selectedRole && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={nameInputModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>What's your name?</Text>
            <Text style={styles.modalSubtitle}>To personalize your interview experience</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              value={tempName}
              onChangeText={setTempName}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.startButton, !tempName.trim() && { opacity: 0.5 }]}
              onPress={handleSaveName}
              disabled={!tempName.trim()}
            >
              <ExpoLinearGradient
                colors={['#f093fb', '#f5576c']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.startButtonText}>Continue</Text>
              </ExpoLinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ExpoLinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    padding: 40,
    width: '100%',
    maxWidth: 450,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2d3748',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#764ba2',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 30,
    textAlign: 'center',
  },
  pickerContainer: {
    width: '100%',
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '700',
    color: '#4a5568',
    letterSpacing: 0.5,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 15,
    padding: 18,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownText: {
    fontSize: 17,
    color: '#2d3748',
    fontWeight: '600',
    flex: 1,
  },
  dropdownIconContainer: {
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    padding: 8,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: 'bold',
  },
  startButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#f5576c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  historyButton: {
    width: '100%',
    paddingVertical: 18,
    marginTop: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#667eea',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  historyButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 25,
    width: '85%',
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2d3748',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 20,
    textAlign: 'center',
  },
  roleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f7fafc',
  },
  selectedRoleItem: {
    backgroundColor: '#e6fffa',
    borderWidth: 2,
    borderColor: '#38b2ac',
  },
  roleText: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
  },
  selectedRoleText: {
    fontWeight: 'bold',
    color: '#38b2ac',
  },
  checkmark: {
    fontSize: 20,
    color: '#38b2ac',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#718096',
    fontSize: 16,
    fontWeight: '600',
  },
  nameInput: {
    width: '100%',
    backgroundColor: '#f7fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: '#2d3748',
  },
  logoutButton: {
    paddingVertical: 10,
    marginTop: 15,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});