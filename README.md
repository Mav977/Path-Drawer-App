# 🤖 Robot Path Drawer (React Native + BLE + ESP32)

This is a **single-page React Native app** that lets you **draw paths on-screen** and then sends that path as **movement instructions** to an ESP32-controlled robot using **Bluetooth Low Energy (BLE)**.

Once the drawing is complete, the app converts the path into real-world coordinates and generates robot commands like `move_forward` and `turn_left`. These commands are then sent over BLE to make your robot follow the drawn path.

---

## 📱 Features

- 🎨 Draw gestures directly on a canvas
- 🔄 Converts drawings into real-world measurements
- 🤖 Translates paths into robot movement commands
- 📡 Sends instructions over BLE to ESP32
- 🖥 Clean UI and real-time feedback

---

## 🧠 How It Works

1. **Draw** a path on the screen.
2. The app:
   - Converts canvas coordinates into centimeters.
   - Refines the path to remove tiny unnecessary movements.
   - Calculates angle and distance between points.
   - Generates an optimized command list for the robot.
3. **Connect** to the ESP32 over BLE.
4. **Send** the JSON command data to the robot.
5. The robot moves according to the path!

---

## 📸 Screenshots

| Drawing Screen | BLE Controls |
| -------------- | ------------ |
| <img src="https://github.com/user-attachments/assets/f0f713cf-ab59-40fd-83d3-c04a4c16b08d" width="250"/> | <img src="https://github.com/user-attachments/assets/6771eb61-b741-4076-82e9-3467891fe396" width="250"/> |

---

## 🔌 Requirements

- React Native (with Expo)
- ESP32 with BLE support
- [`react-native-ble-plx`](https://github.com/dotintent/react-native-ble-plx) for BLE communication
- [`react-native-svg`](https://github.com/software-mansion/react-native-svg) for drawing

---

## 🚀 Setup & Run

```bash
# Install dependencies
npm install

# Run the app (Expo)
npx expo start
