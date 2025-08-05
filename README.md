# Picker Wheel

A simple and interactive picker wheel application for randomly selecting contestants with special coin toss mode and persistent storage.

## Features

- **Add Contestants**: Enter names in the input field and click "Add" or press Enter
- **Visual Wheel**: Contestants are displayed on a colorful spinning wheel
- **Coin Toss Mode**: When you have exactly 2 contestants, it transforms into a coin flip with "HEADS" and "TAILS"
- **Random Selection**: Click "SPIN" (or "FLIP COIN") to randomly select a winner
- **Re-spin/Re-flip**: After a result, use the re-spin button to spin again without clearing contestants
- **Remove Contestants**: Remove individual contestants or clear all at once
- **Persistent Storage**: Your contestants list is automatically saved and restored between browser sessions
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

1. **Add Contestants**: 
   - Type a contestant name in the input field
   - Click "Add" button or press Enter
   - Repeat to add more contestants
   - Your list is automatically saved

2. **Manage Contestants**:
   - View all added contestants in the list
   - Remove individual contestants using the "Remove" button
   - Clear all contestants with the "Clear All" button

3. **Spin the Wheel / Flip the Coin**:
   - **2 contestants**: The wheel becomes a coin, and buttons change to "FLIP COIN" and "FLIP AGAIN"
   - **3+ contestants**: Traditional wheel mode with "SPIN" and "RE-SPIN" buttons
   - The spin/flip button becomes active when you have 2 or more contestants
   - Click to start the animation and wait for the result!

4. **Re-spin/Re-flip**:
   - After getting a result, the re-spin button becomes available
   - Click "RE-SPIN" or "FLIP AGAIN" to spin/flip again with the same contestants
   - No need to clear and re-add your contestants

## Special Features

### 🪙 Coin Toss Mode (2 Contestants)
- Automatically activates when you have exactly 2 contestants
- Beautiful golden coin design with gradient effects
- Shows "HEADS" and "TAILS" with contestant names
- Realistic flipping animation during spin
- Results display which side the coin landed on

### 💾 Local Storage
- Contestants are automatically saved to your browser
- Your list persists when you close and reopen the app
- No account or sign-up required - data stays on your device

### 🔄 Re-spin Functionality
- Keep your contestants and spin/flip multiple times
- Useful for best-of-three scenarios or multiple rounds
- Smart button management - re-spin only available after initial spin

## Running the Application

Simply open `index.html` in your web browser. No server or additional setup required!

## Files

- `index.html` - Main HTML structure
- `style.css` - Styling and animations
- `script.js` - JavaScript functionality and wheel logic

## Browser Compatibility

Works in all modern web browsers that support HTML5 Canvas and ES6 JavaScript.
