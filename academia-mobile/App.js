import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Workspace from './src/Workspace';

export default function App() {
  return <SafeAreaProvider><Workspace /></SafeAreaProvider>;
}
