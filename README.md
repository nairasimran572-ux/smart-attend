# AttendSmart — Smart Attendance Management

An advanced browser-based science exhibition demo using HTML, CSS and JavaScript. It includes student management, QR code generation/scanning, optional face enrollment and recognition, daily attendance, reports, and CSV export.

## 1. What is included

- Student directory with unique student IDs
- Personal QR cards generated for each student
- QR-only attendance
- Face-only attendance (after face enrollment)
- Combined QR + face verification
- Dashboard with today's present/absent summary
- Attendance records and manual correction
- CSV export for spreadsheet use
- Local browser storage (no server/database required)

## 2. Requirements

- Windows, macOS or Linux
- Chrome or Edge recommended
- Internet connection (loads QR/face libraries and face model files from CDNs)
- Webcam
- VS Code (recommended) or another code editor

**Important:** Browsers normally allow camera access only on `localhost` or a secure HTTPS website. Do not open `index.html` by double-clicking it.

## 3. Run the project

### Option A — VS Code Live Server (easiest)

1. Extract `Smart_Attendance_App.zip`.
2. Open the extracted `smart_attendance_app` folder in VS Code.
3. Install the **Live Server** extension if it is not already installed.
4. Right-click `index.html` and choose **Open with Live Server**.
5. The app opens at an address similar to `http://127.0.0.1:5500`.
6. Allow camera permission when prompted.

### Option B — Python local server

1. Install Python if needed.
2. Open Command Prompt / Terminal inside the project folder.
3. Run:

   ```bash
   python -m http.server 8000
   ```

4. Open `http://localhost:8000` in Chrome or Edge.
5. Allow camera access.

## 4. Exhibition demonstration workflow

1. Open **Students** and add a student. Example: `Asha Kumar`, ID `STU001`, Class `10-A`.
2. Click **QR card** beside the student and show/print the generated QR.
3. Click **Enroll face** for that student. The app opens the scanner screen. Start the camera, stand in good lighting, and keep only one face in frame. (For face enrollment, the scanner needs to be in Face only mode; see note below.)
4. Select **QR + Face** mode, start the camera and scan the student's QR card.
5. The app finds the matching student, then asks for face verification.
6. Click **Verify face** while the student is facing the webcam.
7. Open Dashboard or Attendance records to show the recorded check-in.
8. Use Reports → Export CSV to download the attendance file.

### Face enrollment note

For the simplest enrollment workflow:
- Go to Smart scanner.
- Select **Face only** and click **Start camera**.
- Return to Students and click **Enroll face** beside the student.
- If the face profile is not captured, make sure the face models show **ready**, lighting is good, and the face is centered. You may also use the browser console to inspect errors.

## 5. Face recognition model loading

The app uses face-api.js and downloads its model files from the public face-api.js GitHub weights folder when the page loads. Internet access is required on first load. The model files are not bundled in this ZIP.

If face recognition says models could not load:
- Check internet access.
- Reload the page.
- Confirm that your network does not block `cdn.jsdelivr.net` or `raw.githubusercontent.com`.
- QR-only attendance can still be demonstrated if face models are unavailable.

## 6. Data storage and reset

All students, attendance records and face descriptors are saved in the browser's `localStorage` for this website. Data remains on that browser/device and is not automatically shared with another computer.

To reset the demo data, open browser Developer Tools → Console and run:

```javascript
localStorage.removeItem("attendsmart_v1");
location.reload();
```

Export records before resetting if you need to keep them.

## 7. Important limitations / privacy

- This is an exhibition prototype, not a production attendance system.
- Face recognition is approximate and can produce false matches or rejections. The matching threshold is a demo setting.
- Use only volunteers who have agreed to participate. Do not upload or use real student face data without appropriate permission.
- Face descriptors are stored in local browser storage. They are not encrypted, and anyone with access to the browser profile may be able to inspect them.
- There is no real administrator login, cloud database, multi-device sync, liveness detection, or tamper-proof audit log.
- Provide a manual attendance alternative for anyone who cannot or does not want to use face recognition.

## 8. Project structure

```text
smart_attendance_app/
├── index.html
├── styles.css
├── app.js
├── README.md
└── models/          # Reserved for optional local model files
```

## 9. Technologies used

- HTML5 — application structure
- CSS3 — responsive dashboard and layout
- Vanilla JavaScript — application logic and local data
- html5-qrcode — QR scanning
- qrcodejs — QR card generation
- face-api.js — face detection, descriptors and matching
- Browser localStorage — demo persistence
