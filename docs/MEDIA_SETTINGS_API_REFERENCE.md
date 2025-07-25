# API Reference - Media Settings

## Overview
This document provides technical API reference for the media settings functionality in VideoCall Pro.

## Interfaces

### MediaDevice
```typescript
interface MediaDevice {
  deviceId: string;    // Unique device identifier
  label: string;       // Human-readable device name
  kind: "audioinput" | "videoinput" | "audiooutput";
}
```

### MediaSettings
```typescript
interface MediaSettings {
  audioDeviceId: string;        // Audio input device ID
  videoDeviceId: string;        // Video input device ID  
  videoResolution: "480p" | "720p" | "1080p";
  audioVolume: number;          // Volume level (0-100)
  echoCancellation: boolean;    // Echo cancellation on/off
  noiseSuppression: boolean;    // Noise suppression on/off
  autoGainControl: boolean;     // Automatic gain control on/off
}
```

### UseMediaSettingsReturn
```typescript
interface UseMediaSettingsReturn {
  settings: MediaSettings;
  audioDevices: MediaDevice[];
  videoDevices: MediaDevice[];
  outputDevices: MediaDevice[];
  isLoading: boolean;
  updateSettings: (newSettings: Partial<MediaSettings>) => void;
  refreshDevices: () => Promise<void>;
  getMediaConstraints: () => MediaStreamConstraints;
}
```

## Hook: useMediaSettings

### Usage
```typescript
import { useMediaSettings } from '@/hooks/use-media-settings';

const {
  settings,
  audioDevices,
  videoDevices,
  outputDevices,
  isLoading,
  updateSettings,
  refreshDevices,
  getMediaConstraints
} = useMediaSettings();
```

### Functions

#### updateSettings()
Updates media settings partially.

```typescript
updateSettings(newSettings: Partial<MediaSettings>): void
```

**Parameters:**
- `newSettings`: Partial settings object to merge with current settings

**Example:**
```typescript
// Update only video device
updateSettings({ videoDeviceId: "camera123" });

// Update multiple settings
updateSettings({ 
  audioDeviceId: "mic456",
  videoResolution: "1080p",
  audioVolume: 85
});
```

#### refreshDevices()
Refreshes the list of available media devices.

```typescript
refreshDevices(): Promise<void>
```

**Example:**
```typescript
// Refresh device list
await refreshDevices();
console.log("Updated devices:", audioDevices, videoDevices);
```

#### getMediaConstraints()
Generates WebRTC MediaStreamConstraints from current settings.

```typescript
getMediaConstraints(): MediaStreamConstraints
```

**Returns:** MediaStreamConstraints object for getUserMedia()

**Example:**
```typescript
const constraints = getMediaConstraints();
const stream = await navigator.mediaDevices.getUserMedia(constraints);
```

**Generated Constraints Structure:**
```typescript
{
  video: {
    deviceId: { exact: "device-id" } | undefined,
    width: { ideal: number },
    height: { ideal: number },
    facingMode: "user"
  } | false,
  audio: {
    deviceId: { exact: "device-id" } | undefined,
    echoCancellation: boolean,
    noiseSuppression: boolean,
    autoGainControl: boolean
  } | false
}
```

## Component: SettingsModal

### Props
```typescript
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: () => void;
}
```

### Usage
```typescript
import SettingsModal from '@/components/settings-modal';

<SettingsModal
  isOpen={showSettings}
  onClose={() => setShowSettings(false)}
  onSettingsChange={refreshMediaSettings}
/>
```

## WebRTC Integration

### refreshMediaSettings()
Updates WebRTC streams with new media settings.

```typescript
const refreshMediaSettings = async (): Promise<void>
```

**Process:**
1. Refresh device list
2. Stop existing media tracks
3. Get new stream with updated constraints
4. Apply audio/video enabled state
5. Update local stream reference
6. Update all peer connections with new tracks

**Example:**
```typescript
// In useWebRTC hook
const { refreshMediaSettings } = useWebRTC(roomId, displayName);

// Call when settings change
await refreshMediaSettings();
```

## Constants

### Default Settings
```typescript
const DEFAULT_SETTINGS: MediaSettings = {
  audioDeviceId: "default",
  videoDeviceId: "default", 
  videoResolution: "720p",
  audioVolume: 80,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
```

### Resolution Constraints
```typescript
const RESOLUTION_CONSTRAINTS = {
  "480p": { width: { ideal: 640 }, height: { ideal: 480 } },
  "720p": { width: { ideal: 1280 }, height: { ideal: 720 } },
  "1080p": { width: { ideal: 1920 }, height: { ideal: 1080 } },
};
```

## Storage

### LocalStorage Keys
- `mediaSettings`: Serialized MediaSettings object

### Storage Format
```typescript
// Stored as JSON string
localStorage.setItem("mediaSettings", JSON.stringify({
  audioDeviceId: "default",
  videoDeviceId: "camera123",
  videoResolution: "720p",
  audioVolume: 80,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
}));
```

## Events

### Device Change Detection
```typescript
// Automatically handled in useMediaSettings
navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
```

### Browser Permissions
```typescript
// Request permissions for device enumeration
const stream = await navigator.mediaDevices.getUserMedia({ 
  video: true, 
  audio: true 
});

// Enumerate devices (labels available after permission)
const devices = await navigator.mediaDevices.enumerateDevices();

// Clean up temporary stream
stream.getTracks().forEach(track => track.stop());
```

## Error Handling

### Permission Errors
```typescript
try {
  await refreshDevices();
} catch (error) {
  if (error.name === 'NotAllowedError') {
    console.error('Camera/microphone permission denied');
    // Show permission request UI
  }
}
```

### Device Constraints Errors
```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
} catch (error) {
  if (error.name === 'OverconstrainedError') {
    console.error('Device constraints too restrictive');
    // Fallback to default constraints
  }
}
```

### Common Error Types
- `NotAllowedError`: Permission denied
- `NotFoundError`: Device not found
- `NotReadableError`: Device in use by another application
- `OverconstrainedError`: Constraints cannot be satisfied
- `AbortError`: Operation aborted

## Performance Considerations

### Device Enumeration Caching
```typescript
// Cache device list for 5 seconds to avoid excessive calls
let deviceListCache: MediaDeviceInfo[] = [];
let lastDeviceChangeTime = 0;

const getCachedDevices = async (): Promise<MediaDeviceInfo[]> => {
  const now = Date.now();
  if (now - lastDeviceChangeTime < 5000) {
    return deviceListCache;
  }
  
  deviceListCache = await navigator.mediaDevices.enumerateDevices();
  lastDeviceChangeTime = now;
  return deviceListCache;
};
```

### Stream Replacement vs Recreation
```typescript
// Efficient: Replace tracks without recreating peer connections
const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
if (sender) {
  await sender.replaceTrack(newVideoTrack);
}

// Less efficient: Remove and add tracks
await peerConnection.removeTrack(oldSender);
peerConnection.addTrack(newTrack, stream);
```

## Browser Compatibility

### Supported APIs
- `navigator.mediaDevices.getUserMedia()` - All modern browsers
- `navigator.mediaDevices.enumerateDevices()` - All modern browsers  
- `navigator.mediaDevices.addEventListener('devicechange')` - All modern browsers
- `RTCRtpSender.replaceTrack()` - All modern browsers

### Fallbacks
```typescript
// Feature detection
if (!navigator.mediaDevices?.getUserMedia) {
  console.error('getUserMedia not supported');
  // Show unsupported browser message
}

if (!navigator.mediaDevices?.enumerateDevices) {
  console.error('Device enumeration not supported');
  // Use default device only
}
```

## Testing

### Mock Device List
```typescript
// For testing purposes
const mockDevices: MediaDeviceInfo[] = [
  {
    deviceId: 'default',
    kind: 'audioinput',
    label: 'Default Microphone',
    groupId: 'group1'
  },
  {
    deviceId: 'camera123',
    kind: 'videoinput', 
    label: 'Built-in Camera',
    groupId: 'group2'
  }
];

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    enumerateDevices: () => Promise.resolve(mockDevices),
    getUserMedia: () => Promise.resolve(new MediaStream())
  }
});
```

### Unit Test Example
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useMediaSettings } from './use-media-settings';

test('should update settings correctly', async () => {
  const { result } = renderHook(() => useMediaSettings());
  
  act(() => {
    result.current.updateSettings({ audioDeviceId: 'mic123' });
  });
  
  expect(result.current.settings.audioDeviceId).toBe('mic123');
});
```

This API reference provides complete technical documentation for integrating and extending the media settings functionality.
