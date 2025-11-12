# One-Time Passcode (OTP) Management System

## Overview
A secure JavaScript key-value service for managing temporary authentication codes with time-based expiration and single-use enforcement, designed for Kiwi Sports Apparel's login functionality. Now includes a modern, user-friendly web interface!

## 🌟 Features
- ✅ Accepts integer passcodes with duration in milliseconds
- ✅ Maximum 5-minute duration limit for security
- ✅ Automatic expiration and cleanup
- ✅ Returns `true` if unexpired passcode already exists, `false` for new passcodes
- ✅ Duration overwrite capability for existing passcodes
- ✅ Single-use enforcement (passcodes become invalid after first use)
- ✅ **Modern web interface with real-time updates**
- ✅ **Interactive demo functionality**
- ✅ **Responsive design for all devices**

## 🚀 Quick Start

### Option 1: Web Interface (Recommended)
1. Start a local server:
   ```bash
   python -m http.server 8000
   ```
2. Open your browser and navigate to: `http://localhost:8000`
3. Use the interactive interface to issue and verify OTPs!

### Option 2: Command Line Testing
```bash
node otpStore.js
```

## 💻 Web Interface Features

### 🎨 Modern Design
- Gradient background with glassmorphism effects
- Responsive design that works on desktop, tablet, and mobile
- Real-time countdown timers with color-coded progress bars
- Toast notifications for instant feedback

### 🔧 Interactive Components
- **Issue OTP**: Create new passcodes with custom or preset durations
- **Authenticate**: Verify passcodes with instant feedback
- **Active OTPs**: Real-time tracking of all issued passcodes
- **Demo Mode**: Automated demonstration of all features
- **Status Monitor**: Live system status and activity log

### 📱 Responsive Features
- Mobile-optimized interface
- Touch-friendly controls
- Adaptive layouts for all screen sizes

## Usage

### 🌐 Web Interface Usage

The web interface provides an intuitive way to interact with the OTP system:

#### Issuing OTPs
1. Enter a 6-8 digit passcode in the "Issue New OTP" section
2. Select a duration (30 seconds to 5 minutes) or enter a custom duration
3. Click "Issue OTP" - you'll see real-time feedback and tracking

#### Authenticating
1. Enter the passcode in the "Authenticate" section  
2. Click "Verify OTP" - instant feedback shows success or failure
3. Used OTPs are automatically marked and become invalid

#### Monitoring
- **Active OTPs**: View all issued passcodes with countdown timers
- **Status Monitor**: See real-time system activity
- **Progress Bars**: Visual indication of remaining time (green → yellow → red)

#### Demo Mode
Click "Run Automated Demo" to see a complete workflow:
- Issues a demo OTP (999888)
- Authenticates successfully 
- Demonstrates single-use enforcement

### 📝 Programmatic Usage

```javascript
const { createOtpStore } = require('./otpStore');

// Create OTP store instance
const otp = createOtpStore();

// Issue new passcode (returns false for new keys)
const isExisting = otp.issue(123456, 30000); // 30 seconds
console.log(isExisting); // false (new passcode)

// Re-issue same passcode with new duration (returns true for existing keys)
const reissued = otp.issue(123456, 60000); // 1 minute (overwrites previous duration)
console.log(reissued); // true (existing passcode, duration updated)

// Use passcode for authentication (returns true if valid)
const loginSuccess = otp.useOnce(123456);
console.log(loginSuccess); // true (login accepted)

// Try to use same passcode again (returns false - single use)
const secondAttempt = otp.useOnce(123456);
console.log(secondAttempt); // false (already used)
```

## API Reference

### `createOtpStore()`
Creates a new OTP store instance.

**Returns:** Object with `issue` and `useOnce` methods

### `issue(passcode, durationMs)`
Issues a new passcode or updates an existing one.

**Parameters:**
- `passcode` (number): Integer passcode (e.g., 123456)
- `durationMs` (number): Duration in milliseconds (maximum 5 minutes)

**Returns:** 
- `true` if passcode already existed and was unexpired
- `false` if new passcode was created

### `useOnce(passcode)`
Attempts to use a passcode for authentication. Each passcode can only be used once.

**Parameters:**
- `passcode` (number): Integer passcode to validate

**Returns:**
- `true` if login accepted (passcode valid and unused)
- `false` if login rejected (invalid, expired, or already used)

## Testing

Run the built-in test suite:

```bash
node otpStore.js
```

This will execute comprehensive tests verifying all client requirements.

## Client Requirements Compliance

The program fully meets all specified client requirements:

1. **Integer passcode acceptance** ✅ - Accepts integer passcodes as input
2. **Duration in milliseconds** ✅ - Duration specified in milliseconds
3. **5-minute maximum limit** ✅ - Automatically caps duration to 5 minutes (300,000ms)
4. **Inaccessible after expiration** ✅ - Expired passcodes are automatically purged
5. **Returns true for existing unexpired keys** ✅ - Correctly identifies existing passcodes
6. **Returns false for new keys** ✅ - Correctly identifies new passcodes
7. **Duration overwrite** ✅ - Updates duration for existing passcodes
8. **Secure login functionality** ✅ - Single-use enforcement prevents replay attacks

## Security Features

- **Time-based expiration**: Passcodes automatically expire after specified duration
- **Maximum duration cap**: 5-minute limit prevents excessively long-lived passcodes
- **Single-use enforcement**: Each passcode can only be used once for authentication
- **Automatic cleanup**: Expired and used passcodes are automatically removed
- **Memory efficiency**: Purging prevents memory leaks in long-running applications

## Implementation Summary

The program implements a secure OTP system using JavaScript's Map data structure for efficient key-value storage. It employs automatic cleanup mechanisms, enforces security constraints (5-minute maximum, single-use), and provides clear boolean return values for integration with authentication systems. The solution balances security requirements with usability, ensuring passcodes are both secure and manageable for temporary authentication scenarios.

## Author
Kiwi Sports Apparel Development Team

---

### MicroCredit_JS_Shaheer
Repo for my JS assignments in WhiteCliffe
