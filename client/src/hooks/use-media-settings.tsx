import { useState, useEffect, useCallback } from "react";

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "videoinput" | "audiooutput";
}

export interface MediaSettings {
  audioDeviceId: string;
  videoDeviceId: string;
  videoResolution: "480p" | "720p" | "1080p";
  audioVolume: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface UseMediaSettingsReturn {
  settings: MediaSettings;
  audioDevices: MediaDevice[];
  videoDevices: MediaDevice[];
  outputDevices: MediaDevice[];
  isLoading: boolean;
  updateSettings: (newSettings: Partial<MediaSettings>) => void;
  refreshDevices: () => Promise<void>;
  getMediaConstraints: () => MediaStreamConstraints;
}

const DEFAULT_SETTINGS: MediaSettings = {
  audioDeviceId: "default",
  videoDeviceId: "default",
  videoResolution: "720p",
  audioVolume: 80,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const RESOLUTION_CONSTRAINTS = {
  "480p": { width: { ideal: 640 }, height: { ideal: 480 } },
  "720p": { width: { ideal: 1280 }, height: { ideal: 720 } },
  "1080p": { width: { ideal: 1920 }, height: { ideal: 1080 } },
};

export function useMediaSettings(): UseMediaSettingsReturn {
  const [settings, setSettings] = useState<MediaSettings>(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem("mediaSettings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("mediaSettings", JSON.stringify(settings));
  }, [settings]);

  const refreshDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Request permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      // Get device list
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Stop the temporary stream
      stream.getTracks().forEach(track => track.stop());
      
      // Categorize devices
      const audioInputs: MediaDevice[] = [];
      const videoInputs: MediaDevice[] = [];
      const audioOutputs: MediaDevice[] = [];

      devices.forEach(device => {
        const mediaDevice: MediaDevice = {
          deviceId: device.deviceId,
          label: device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`,
          kind: device.kind as "audioinput" | "videoinput" | "audiooutput"
        };

        switch (device.kind) {
          case "audioinput":
            audioInputs.push(mediaDevice);
            break;
          case "videoinput":
            videoInputs.push(mediaDevice);
            break;
          case "audiooutput":
            audioOutputs.push(mediaDevice);
            break;
        }
      });

      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);
      setOutputDevices(audioOutputs);

      console.log("Media devices refreshed:", {
        audioInputs: audioInputs.length,
        videoInputs: videoInputs.length,
        audioOutputs: audioOutputs.length
      });

    } catch (error) {
      console.error("Failed to refresh media devices:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial device enumeration
  useEffect(() => {
    refreshDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      console.log("Media devices changed, refreshing...");
      refreshDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [refreshDevices]);

  const updateSettings = useCallback((newSettings: Partial<MediaSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const getMediaConstraints = useCallback((): MediaStreamConstraints => {
    const resolution = RESOLUTION_CONSTRAINTS[settings.videoResolution];
    
    return {
      video: settings.videoDeviceId === "none" ? false : {
        deviceId: settings.videoDeviceId === "default" ? undefined : { exact: settings.videoDeviceId },
        ...resolution,
        facingMode: "user"
      },
      audio: settings.audioDeviceId === "none" ? false : {
        deviceId: settings.audioDeviceId === "default" ? undefined : { exact: settings.audioDeviceId },
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
      }
    };
  }, [settings]);

  return {
    settings,
    audioDevices,
    videoDevices,
    outputDevices,
    isLoading,
    updateSettings,
    refreshDevices,
    getMediaConstraints,
  };
}
