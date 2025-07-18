// App.tsx
import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  Button,
  Alert,
  ScrollView,
  Text,
  PermissionsAndroid,
  Platform,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";

type Point = { x: number; y: number };
type PathType = Point[];

// Canvas config
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;
const GROUND_WIDTH_CM = 100;
const GROUND_HEIGHT_CM = 100;
const scaleX = GROUND_WIDTH_CM / CANVAS_WIDTH;
const scaleY = GROUND_HEIGHT_CM / CANVAS_HEIGHT;

// BLE config
const DEVICE_NAME = "RobotDrawer_ESP32";
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

const bleManager = new BleManager();

export default function App() {
  const [paths, setPaths] = useState<PathType[]>([]);
  const [currentPath, setCurrentPath] = useState<PathType>([]);
  const [bleDevice, setBleDevice] = useState<Device | null>(null);
  const [bleStatus, setBleStatus] = useState("Disconnected");
  const scanningRef = useRef(false);

  const insideCanvas = (x: number, y: number) =>
    x >= 0 && x <= CANVAS_WIDTH && y >= 0 && y <= CANVAS_HEIGHT;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e: GestureResponderEvent) => {
      const { locationX, locationY } = e.nativeEvent;
      if (insideCanvas(locationX, locationY)) {
        setCurrentPath([{ x: locationX, y: locationY }]);
      }
    },
    onPanResponderMove: (e: GestureResponderEvent) => {
      const { locationX, locationY } = e.nativeEvent;
      if (insideCanvas(locationX, locationY)) {
        setCurrentPath((prev) => [...prev, { x: locationX, y: locationY }]);
      }
    },
    onPanResponderRelease: () => {
      if (currentPath.length > 0) {
        setPaths((prev) => {
          const newPaths = [...prev, currentPath];

          const realWorldPaths: [number, number][][] = newPaths.map((path) =>
            path.map((p) => [
              parseFloat((p.x * scaleX).toFixed(2)),
              parseFloat(((CANVAS_HEIGHT - p.y) * scaleY).toFixed(2)),
            ])
          );

          const refinedPaths = realWorldPaths.map((path) =>
            refinePath(path, 3)
          );

          const robotCommands = refinedPaths.map((path) => {
            const commands = pathToRobotCommands(path);
            return optimizeCommands(commands);
          });

          console.log("📍 Refined paths:", refinedPaths);
          
          console.log("📤 JSON for ESP32:", JSON.stringify(robotCommands));

          return newPaths;
        });
        setCurrentPath([]);
      }
    },
  });

  function refinePath(path: [number, number][], threshold: number = 3): [number, number][] {
    if (path.length === 0) return [];
    const refined: [number, number][] = [path[0]];
    for (let i = 1; i < path.length; i++) {
      const [prevX, prevY] = refined[refined.length - 1];
      const [currX, currY] = path[i];
      const dx = Math.abs(currX - prevX);
      const dy = Math.abs(currY - prevY);
      if (dx < threshold && dy < threshold) continue;
      refined.push([currX, currY]);
    }
    return refined;
  }

  type RobotCommand = {
    type: "move_forward" | "move_backward" | "turn_left" | "turn_right";
    value: number;
  };

  function pathToRobotCommands(path: [number, number][]): RobotCommand[] {
    if (path.length < 2) return [];
    const commands: RobotCommand[] = [];
    let currentAngle = 90;
    for (let i = 1; i < path.length; i++) {
      const [prevX, prevY] = path[i - 1];
      const [currX, currY] = path[i];
      const dx = currX - prevX;
      const dy = currY - prevY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 0.5) continue;
      const targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      let angleDiff = targetAngle - currentAngle;
      while (angleDiff > 180) angleDiff -= 360;
      while (angleDiff < -180) angleDiff += 360;
      if (Math.abs(angleDiff) > 5) {
        if (angleDiff > 0) {
          commands.push({ type: "turn_left", value: Math.round(angleDiff) });
        } else {
          commands.push({ type: "turn_right", value: Math.round(Math.abs(angleDiff)) });
        }
        currentAngle = targetAngle;
      }
      commands.push({ type: "move_forward", value: Math.round(distance * 10) / 10 });
    }
    return commands;
  }

  function optimizeCommands(commands: RobotCommand[]): RobotCommand[] {
    if (commands.length === 0) return [];
    const optimized: RobotCommand[] = [];
    let current = commands[0];
    for (let i = 1; i < commands.length; i++) {
      const next = commands[i];
      if (current.type === next.type) {
        current.value += next.value;
      } else {
        optimized.push(current);
        current = next;
      }
    }
    optimized.push(current);
    return optimized;
  }

  const getSmoothPath = (points: Point[]) => {
    if (points.length < 2) return "";
    const tension = 0.2;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const control1 = {
        x: p1.x + (p2.x - p0.x) * tension,
        y: p1.y + (p2.y - p0.y) * tension,
      };
      const control2 = {
        x: p2.x - (p3.x - p1.x) * tension,
        y: p2.y - (p3.y - p1.y) * tension,
      };
      d += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const handleClear = () => {
    Alert.alert("Clear Drawing", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", onPress: () => setPaths([]) },
    ]);
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];
      const granted = await PermissionsAndroid.requestMultiple(permissions);
      return permissions.every((p) => granted[p] === PermissionsAndroid.RESULTS.GRANTED);
    }
    return true;
  };

  const connectToESP32 = async () => {
    if (scanningRef.current) return;
    setBleStatus("Scanning...");
    scanningRef.current = true;
    const hasPerm = await requestPermissions();
    if (!hasPerm) {
      setBleStatus("No BLE permission");
      scanningRef.current = false;
      return;
    }

    bleManager.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        setBleStatus("Scan error");
        scanningRef.current = false;
        bleManager.stopDeviceScan();
        return;
      }
      if (device && device.name === DEVICE_NAME) {
        setBleStatus(`Connecting to ${DEVICE_NAME}...`);
        bleManager.stopDeviceScan();
        scanningRef.current = false;
        try {
          const connectedDevice = await device.connect();
          await connectedDevice.discoverAllServicesAndCharacteristics();
          setBleDevice(connectedDevice);
          setBleStatus("Connected");

          // ✅ Disconnect listener
          connectedDevice.onDisconnected((err, dev) => {
            console.log("❌ Disconnected from ESP32", err);
            setBleDevice(null);
            setBleStatus("Disconnected");
          });
        } catch (err) {
          setBleStatus("Connection error");
          setBleDevice(null);
        }
      }
    });

    setTimeout(() => {
      if (scanningRef.current) {
        bleManager.stopDeviceScan();
        setBleStatus("Scan timeout");
        scanningRef.current = false;
      }
    }, 10000);
  };

  const getRealWorldPaths = () =>
    paths.map((path) =>
      path.map((p) => [
        parseFloat((p.x * scaleX).toFixed(2)),
        parseFloat(((CANVAS_HEIGHT - p.y) * scaleY).toFixed(2)),
      ])
    );

  const sendDrawing = async () => {
    if (!bleDevice) {
      setBleStatus("Disconnected");
      Alert.alert("Not Connected", "Please connect to your ESP32 device first.");
      return;
    }

    try {
      const realWorldPaths = getRealWorldPaths();
      const refinedPaths = realWorldPaths.map((path) =>
        refinePath(path as [number, number][], 3)
      );
      const robotCommands = refinedPaths.map((path) => {
        const commands = pathToRobotCommands(path);
        return optimizeCommands(commands);
      });
      const json = JSON.stringify(robotCommands);
      const chunkSize = 180;
      for (let i = 0; i < json.length; i += chunkSize) {
        const chunk = json.slice(i, i + chunkSize);
        const base64 = Buffer.from(chunk).toString("base64");
        await bleDevice.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          base64
        );
        await new Promise((res) => setTimeout(res, 50));
      }
      Alert.alert("Success", "Robot commands sent!");
    } catch (e: any) {
      console.error("Send failed:", e);
      Alert.alert("Error", "Failed to send commands.\n" + (e?.message || e));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.canvasContainer} {...panResponder.panHandlers}>
        <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
          <Rect
            x="0"
            y="0"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            stroke="black"
            strokeWidth={10}
            fill="white"
          />
          {paths.map((p, i) => (
            <Path
              key={i}
              d={getSmoothPath(p)}
              stroke="black"
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath.length > 1 && (
            <Path
              d={getSmoothPath(currentPath)}
              stroke="gray"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
      </View>
      <View style={{ marginTop: 10 }}>
        <Button title="Clear Drawing" onPress={handleClear} color="#d9534f" />
        <View style={{ height: 10 }} />
        <Button
          title="Connect to ESP32"
          onPress={connectToESP32}
          disabled={bleStatus === "Connected" || bleStatus === "Scanning..."}
          color="#4682b4"
        />
        <View style={{ height: 10 }} />
        <Button
          title="Send Drawing to ESP32"
          onPress={sendDrawing}
          disabled={!bleDevice}
          color="#228B22"
        />
        <Text style={{ marginTop: 20, textAlign: "center" }}>
          BLE Status: {bleStatus}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    flexGrow: 1,
  },
  canvasContainer: {
    borderWidth: 2,
    borderColor: "black",
    backgroundColor: "white",
  },
});
