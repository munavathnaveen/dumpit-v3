// Auth stack params
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Main stack params  
export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;
  Notifications: undefined;
};

// Root navigator params
export type RootStackParamList = {
  Auth: AuthStackParamList;
  Main: MainStackParamList;
  Loading: undefined;
}; 