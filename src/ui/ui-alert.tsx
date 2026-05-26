import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { T } from './theme';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'cancel' | 'destructive' | 'default';
}

export interface AlertPayload {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

type Listener = (payload: AlertPayload | null) => void;
const listeners = new Set<Listener>();

export function registerAlertListener(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function uiAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
) {
  // If we have custom UI listeners active in React, notify them (non-blocking)
  if (listeners.size > 0) {
    listeners.forEach(l => l({ title, message, buttons }));
    return;
  }

  // Fallback for environment constraints
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    console.log(`[GlobalAlert Fallback]: ${text}`);
    if (buttons && buttons.length > 0) {
      const primary = buttons.find(b => b.style !== 'cancel') || buttons[0];
      primary.onPress?.();
    }
  } else {
    // Native Alert fallback
    const { Alert } = require('react-native');
    const nativeButtons = buttons?.map(b => ({
      text: b.text,
      onPress: b.onPress,
      style: b.style,
    }));
    Alert.alert(title, message, nativeButtons);
  }
}

// GlobalAlert UI Component
export function GlobalAlert() {
  const [alert, setAlert] = useState<AlertPayload | null>(null);

  useEffect(() => {
    return registerAlertListener(payload => {
      setAlert(payload);
    });
  }, []);

  if (!alert) return null;

  const handlePress = (onPress?: () => void) => {
    setAlert(null);
    if (onPress) {
      // Execute the callback safely after the modal dismiss
      setTimeout(() => {
        onPress();
      }, 50);
    }
  };

  const buttons = alert.buttons && alert.buttons.length > 0 
    ? alert.buttons 
    : [{ text: 'OK', style: 'default' as const }];

  return (
    <Modal
      transparent
      visible={true}
      animationType="fade"
      onRequestClose={() => handlePress()}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>{alert.title}</Text>
          {alert.message ? <Text style={s.message}>{alert.message}</Text> : null}

          <View style={s.btnRow}>
            {buttons.map((b, idx) => {
              const isCancel = b.style === 'cancel';
              const isDestructive = b.style === 'destructive';
              
              let bg = T.card;
              let border = T.border;
              let textCol = T.text;

              if (isDestructive) {
                bg = 'rgba(229, 90, 60, 0.15)';
                border = T.red;
                textCol = T.red;
              } else if (!isCancel) {
                // Default / primary
                bg = 'rgba(60, 207, 231, 0.15)';
                border = T.cyan;
                textCol = T.cyan;
              }

              return (
                <TouchableOpacity
                  key={`${b.text}-${idx}`}
                  style={[s.btn, { backgroundColor: bg, borderColor: border }]}
                  onPress={() => handlePress(b.onPress)}
                  testID={`global-alert-btn-${idx}`}
                >
                  <Text style={[s.btnText, { color: textCol }]}>{b.text.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 2, 14, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: T.panel,
    borderWidth: 2,
    borderColor: '#2C2F33',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: T.text,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    color: T.textDim,
    lineHeight: 20,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
