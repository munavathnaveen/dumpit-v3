import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

import Card3D from '../components/Card3D';
import Button from '../components/Button';
import Input from '../components/Input';
import ScreenHeader from '../components/ScreenHeader';
import { theme } from '../theme';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/authSlice';
import { fetchAddresses, addAddress, updateAddress, removeAddress } from '../store/userSlice';
import * as userApi from '../api/userApi';
import * as authApi from '../api/authApi';
import { Address, AddressRequest } from '../api/userApi';
import alert from '../utils/alert';
import { USER_ROLES } from '../utils/constants';

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { addresses, loading } = useSelector((state: RootState) => state.user);
  
  const isVendor = user?.role === USER_ROLES.VENDOR;

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Password changing state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Address state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [currentAddressId, setCurrentAddressId] = useState<string | null>(null);
  const [addressName, setAddressName] = useState('');
  const [village, setVillage] = useState('');
  const [street, setStreet] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Memoize the fetch addresses function
  const fetchUserAddresses = useCallback(() => {
    if (!isVendor && user?._id) {
      dispatch(fetchAddresses());
    }
  }, [dispatch, isVendor, user?._id]);

  // Only fetch addresses when the component mounts or when user ID changes
  useEffect(() => {
    fetchUserAddresses();
  }, [fetchUserAddresses]);

  // Profile update
  const handleUpdateProfile = async () => {
    console.log("Updating profile");
    if (!user) return;
    console.log(name,phone);
    if (!name.trim() || !phone.trim()) {
      alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setIsSubmittingProfile(true);

    try {
      const response = await authApi.updateDetails({ name, phone });
      if (response.success) {
        alert('Success', 'Profile updated successfully!');
        setIsEditingProfile(false);
        // Update user in Redux store
        dispatch({ type: 'auth/loadUser/fulfilled', payload: response.data });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Update Failed', 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Password update
  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || !currentPassword.trim() || !confirmPassword.trim()) {
      alert('Missing Information', 'Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Password Mismatch', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      await authApi.updatePassword({ currentPassword, newPassword });
      alert('Success', 'Password updated successfully!');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password update error:', error);
      alert('Update Failed', 'Failed to update password. Please check your current password and try again.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Address handlers
  const resetAddressForm = () => {
    setAddressName('');
    setVillage('');
    setStreet('');
    setDistrict('');
    setState('');
    setPincode('');
    setAddressPhone('');
    setIsDefault(false);
    setCurrentAddressId(null);
  };

  const handleEditAddress = (address: Address) => {
    setAddressName(address.name);
    setVillage(address.village);
    setStreet(address.street);
    setDistrict(address.district);
    setState(address.state);
    setPincode(address.pincode);
    setAddressPhone(address.phone);
    setIsDefault(address.isDefault);
    setCurrentAddressId(address._id);
    setIsEditingAddress(true);
    setIsAddingAddress(true);
  };

  const handleDeleteAddress = (addressId: string) => {
    alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(removeAddress(addressId));
          },
        },
      ]
    );
  };

  const handleSaveAddress = () => {
    if (!addressName || !village || !street || !district || !state || !pincode || !addressPhone) {
      alert('Missing Information', 'Please fill in all required address fields.');
      return;
    }

    const addressData: AddressRequest = {
      name: addressName,
      village,
      street,
      district,
      state,
      pincode,
      phone: addressPhone,
      isDefault,
    };

    if (isEditingAddress && currentAddressId) {
      dispatch(updateAddress({ addressId: currentAddressId, addressData }));
    } else {
      dispatch(addAddress(addressData));
    }

    setIsAddingAddress(false);
    resetAddressForm();
  };

  // Logout
  const handleLogout = () => {
    alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
          },
        },
      ]
    );
  };

  const handleAddressCard = (address: Address) => (
    <Card3D key={address._id} style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.addressTitleContainer}>
          <Text style={styles.addressTitle}>{address.name || 'Address'}</Text>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
        <View style={styles.addressActions}>
          <TouchableOpacity
            style={styles.addressEditButton}
            onPress={() => handleEditAddress(address)}
          >
            <FontAwesome name="pencil" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addressDeleteButton}
            onPress={() => handleDeleteAddress(address._id)}
          >
            <FontAwesome name="trash" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.addressDetails}>
        <Text style={styles.addressText}>{address.street}, {address.village}</Text>
        <Text style={styles.addressText}>{address.district}, {address.state} - {address.pincode}</Text>
        <Text style={styles.addressText}>Phone: {address.phone}</Text>
      </View>
    </Card3D>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" showBackButton={true} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Profile Card */}
        <Card3D style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: user?.avatar_url || 'https://via.placeholder.com/150' }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          <Text style={styles.role}>{user?.role}</Text>

          {isEditingProfile ? (
            <View style={styles.editProfileForm}>
              <Input
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                required
              />
              <Input
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Your phone number"
                keyboardType="phone-pad"
                required
              />
              <View style={styles.buttonRow}>
                <Button
                  title="Cancel"
                  type="secondary"
                  onPress={() => {
                    setName(user?.name || '');
                    setPhone(user?.phone || '');
                    setIsEditingProfile(false);
                  }}
                  style={styles.formButton}
                />
                <Button
                  title={isSubmittingProfile ? 'Saving...' : 'Save'}
                  onPress={handleUpdateProfile}
                  disabled={isSubmittingProfile}
                  style={styles.formButton}
                />
              </View>
            </View>
          ) : (
            <Button
              title="Edit Profile"
              onPress={() => setIsEditingProfile(true)}
              icon="edit"
              style={styles.editButton}
            />
          )}

          <Button
            title={isChangingPassword ? 'Cancel' : 'Change Password'}
            type={isChangingPassword ? 'secondary' : 'primary'}
            onPress={() => setIsChangingPassword(!isChangingPassword)}
            icon={isChangingPassword ? 'close' : 'lock'}
            style={styles.changePasswordButton}
          />

          {isChangingPassword && (
            <View style={styles.passwordForm}>
              <Input
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Your current password"
                secureTextEntry
                required
              />
              <Input
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
                secureTextEntry
                required
              />
              <Input
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                required
              />
              <Button
                title={isSubmittingPassword ? 'Updating...' : 'Update Password'}
                onPress={handleUpdatePassword}
                disabled={isSubmittingPassword}
              />
            </View>
          )}
        </Card3D>

        {/* Addresses - Only for customers */}
        {!isVendor && (
          <Card3D style={styles.addressesCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons name="location-on" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>My Addresses</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  resetAddressForm();
                  setIsAddingAddress(true);
                }}
              >
                <FontAwesome name="plus" size={16} color={theme.colors.white} />
                <Text style={styles.addButtonText}>Add New</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : addresses.length === 0 ? (
              <View style={styles.emptyAddressContainer}>
                <FontAwesome5 name="map-marker-alt" size={50} color={theme.colors.gray} />
                <Text style={styles.noAddressesText}>No addresses found</Text>
                <TouchableOpacity
                  style={styles.addAddressButton}
                  onPress={() => {
                    resetAddressForm();
                    setIsAddingAddress(true);
                  }}
                >
                  <Text style={styles.addAddressButtonText}>Add New Address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.addressList}>
                {addresses.map(address => (
                  <View key={address._id} style={styles.addressItem}>
                    {handleAddressCard(address)}
                  </View>
                ))}
              </View>
            )}
          </Card3D>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Address Form Modal */}
      <Modal
        visible={isAddingAddress}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setIsAddingAddress(false);
          resetAddressForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <Card3D style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditingAddress ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsAddingAddress(false);
                  resetAddressForm();
                }}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Input
                label="Address Name (e.g. Home, Work)"
                value={addressName}
                onChangeText={setAddressName}
                placeholder="Enter a name for this address"
              />
              <Input
                label="Village/Town"
                value={village}
                onChangeText={setVillage}
                placeholder="Enter village or town"
              />
              <Input
                label="Street"
                value={street}
                onChangeText={setStreet}
                placeholder="Enter street name"
              />
              <Input
                label="District"
                value={district}
                onChangeText={setDistrict}
                placeholder="Enter district"
              />
              <Input
                label="State"
                value={state}
                onChangeText={setState}
                placeholder="Enter state"
              />
              <Input
                label="Pincode"
                value={pincode}
                onChangeText={setPincode}
                placeholder="Enter pincode"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Input
                label="Phone Number"
                value={addressPhone}
                onChangeText={setAddressPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                maxLength={10}
              />
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Set as default address</Text>
                <Switch
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: theme.colors.lightGray, true: theme.colors.primary }}
                  thumbColor={theme.colors.white}
                />
              </View>
              <Button
                title="Save Address"
                onPress={handleSaveAddress}
                style={styles.saveButton}
                variant="primary"
              />
            </ScrollView>
          </Card3D>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: 16,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  phone: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xs,
  },
  role: {
    fontSize: 14,
    color: theme.colors.textLight,
    textTransform: 'capitalize',
    marginBottom: theme.spacing.md,
  },
  editButton: {
    marginVertical: theme.spacing.md,
  },
  changePasswordButton: {
    marginTop: theme.spacing.sm,
  },
  editProfileForm: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  passwordForm: {
    width: '100%',
    marginTop: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  formButton: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  addressesCard: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
  },
  addButtonText: {
    color: theme.colors.white,
    marginLeft: theme.spacing.xs,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyAddressContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  noAddressesText: {
    color: theme.colors.textLight,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    fontSize: 16,
  },
  addAddressButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.medium,
  },
  addAddressButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressList: {
    gap: theme.spacing.md,
  },
  addressCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  addressTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  defaultBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    marginLeft: theme.spacing.sm,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressEditButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  addressDeleteButton: {
    padding: theme.spacing.xs,
  },
  addressDetails: {
    marginTop: theme.spacing.sm,
  },
  addressText: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 2,
  },
  logoutButton: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    padding: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalBody: {
    maxHeight: 400,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  switchLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  saveButton: {
    marginTop: theme.spacing.md,
  },
  addressItem: {
    marginBottom: theme.spacing.md,
  },
});

export default ProfileScreen;