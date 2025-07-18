🤖 Robot Path Drawer (React Native + BLE + ESP32)
This is a single-page React Native app that lets you draw paths on-screen and then sends that path as movement instructions to an ESP32-controlled robot using Bluetooth Low Energy (BLE).

Once the drawing is complete, the app converts the path into real-world coordinates and generates robot commands like move_forward and turn_left. These commands are then sent over BLE to make your robot move along the drawn path.

📱 Features
🎨 Draw gestures directly on a canvas

🔄 Converts drawings into real-world measurements

🤖 Translates paths into robot movement commands

📡 Sends instructions over BLE to ESP32

📷 Real-time UI feedback and clean controls

🧠 How It Works
Draw a path on the screen.

The app:

Converts canvas coordinates into centimeters.

Refines the path to remove small unnecessary movements.

Calculates the angles and distances between points.

Generates an optimized command list for the robot.

Connect to the ESP32 over BLE.

Send the JSON command data to the robot.

The robot follows the path!

📸 Screenshots
Drawing Screen	BLE Controls
	
<img width="260" height="567" alt="image" src="https://github.com/user-attachments/assets/f0f713cf-ab59-40fd-83d3-c04a4c16b08d" />
<img width="259" height="567" alt="image" src="https://github.com/user-attachments/assets/6771eb61-b741-4076-82e9-3467891fe396" />

🔌 Requirements
React Native (with Expo)

ESP32 (with BLE support)

react-native-ble-plx for Bluetooth communication

react-native-svg for drawing

🚀 Setup & Run
bash
Copy
Edit
# Install dependencies
npm install

# Run the app (Expo)
npx expo start
To build for Android, use:

bash
Copy
Edit
eas build -p android
📡 Connect to ESP32
Make sure your ESP32:

Is powered on

Has BLE server running with correct service/characteristic UUIDs

Is advertising with name "RobotDrawer_ESP32"

📦 Bluetooth JSON Format Example
json
Copy
Edit
[
  [
    { "type": "turn_left", "value": 45 },
    { "type": "move_forward", "value": 12.5 },
    ...
  ]
]
Each path is sent as an array of command objects.

🛠 Future Improvements
Undo/Redo support

Real-time robot position tracking

Path playback animation

Save/load previous drawings
