import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import Button from './Button';

interface AddReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, text: string) => Promise<void>;
  title: string;
  subtitle?: string;
  loading?: boolean;
}

const AddReviewModal: React.FC<AddReviewModalProps> = ({
  visible,
  onClose,
  onSubmit,
  title,
  subtitle,
  loading = false,
}) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dimensions = useWindowDimensions();

  // Responsive calculations
  const modalWidth = dimensions.width < 380 ? dimensions.width - 40 : 350;

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting your review.');
      return;
    }

    if (reviewText.trim().length < 10) {
      Alert.alert('Review Too Short', 'Please write a review with at least 10 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(rating, reviewText.trim());
      
      // Reset form
      setRating(0);
      setReviewText('');
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setRating(0);
      setReviewText('');
      onClose();
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          style={styles.starButton}
          onPress={() => setRating(i)}
          disabled={submitting || loading}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={28}
            color={i <= rating ? theme.colors.warning : theme.colors.gray}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { width: modalWidth }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={submitting || loading}
            >
              <Ionicons name="close" size={24} color={theme.colors.gray} />
            </TouchableOpacity>
          </View>

          {/* Rating Section */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionLabel}>Rating *</Text>
            {renderStars()}
            <Text style={styles.ratingText}>
              {rating === 0 ? 'Tap a star to rate' : `${rating} out of 5 stars`}
            </Text>
          </View>

          {/* Review Text Section */}
          <View style={styles.reviewSection}>
            <Text style={styles.sectionLabel}>Your Review *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Share your experience..."
              placeholderTextColor={theme.colors.gray}
              multiline
              numberOfLines={4}
              value={reviewText}
              onChangeText={setReviewText}
              maxLength={500}
              editable={!submitting && !loading}
            />
            <Text style={styles.charCount}>
              {reviewText.length}/500 characters
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, (submitting || loading) && styles.disabledButton]}
              onPress={handleClose}
              disabled={submitting || loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <Button
              title={submitting ? "Submitting..." : "Submit Review"}
              onPress={handleSubmit}
              disabled={submitting || loading || rating === 0}
              loading={submitting}
              style={styles.submitButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    ...theme.shadow.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.dark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  closeButton: {
    padding: 4,
  },
  ratingSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  reviewSection: {
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.dark,
    backgroundColor: theme.colors.inputBg,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.gray,
    textAlign: 'right',
    marginTop: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  submitButton: {
    flex: 1.5,
  },
});

export default AddReviewModal; 