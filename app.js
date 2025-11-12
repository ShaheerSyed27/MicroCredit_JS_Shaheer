/**
 * Frontend Application for Kiwi Sports Apparel OTP System
 * ---------------------------------------------------------------------------
 * This file acts as the presentation layer that wires the browser UI to the
 * shared OTP store (see otpStore.js). Everything in here is focused on the
 * "experience": collecting form inputs, triggering business logic, and keeping
 * the interface stateful and reactive for support staff.
 */

// Global OTP store instance - populated once the shared module is loaded.
let otpStore;

// Map<passcode, OTPMeta> - mirrors the backend store so the UI can render
// additional metadata (e.g., countdown timers, reused status, etc.).
let activeOTPs = new Map();

// Map<passcode, IntervalId> - dedicated timers per OTP so we can cleanly cancel
// interval updates when an OTP expires or is consumed.
let timers = new Map();

// DOM lookups for high-traffic UI elements. Keeping them as globals prevents
// repeated querySelector calls on every render cycle.
const issueForm = document.getElementById('issueForm');
const authForm = document.getElementById('authForm');
const durationSelect = document.getElementById('duration');
const customDurationGroup = document.getElementById('customDurationGroup');
const statusContent = document.getElementById('statusContent');
const otpList = document.getElementById('otpList');
const runDemoBtn = document.getElementById('runDemo');

// Bootstrapping entry-point. Once the DOM is parsed we can safely access form
// fields and mount all event listeners in one place.
document.addEventListener('DOMContentLoaded', function() {
    initializeOTPStore();
    setupEventListeners();
    updateStatus('OTP System Initialized', 'success');
});

/**
 * Initialize the OTP store and setup initial state
 */
function initializeOTPStore() {
    try {
        // Initialize OTP store from otpStore.js
        if (typeof createOtpStore === 'function') {
            otpStore = createOtpStore();
            console.log('OTP Store initialized successfully');
        } else {
            throw new Error('OTP Store not available');
        }
    } catch (error) {
        console.error('Failed to initialize OTP store:', error);
        showToast('Failed to initialize OTP system', 'Error', 'error');
    }
}

/**
 * Setup all event listeners for the application
 */
function setupEventListeners() {
    // Duration select change handler - toggles the custom duration field when
    // the "custom" option is chosen so we do not overwhelm users with extra
    // inputs until necessary.
    durationSelect.addEventListener('change', function() {
        const isCustom = this.value === 'custom';
        customDurationGroup.style.display = isCustom ? 'block' : 'none';
    });

    // Issue OTP form submission - orchestrates validation and store updates.
    issueForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleIssueOTP();
    });

    // Authentication form submission - mirrors the real login flow where an
    // end user presents their one-time code.
    authForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleAuthentication();
    });

    // Demo button - provides a guided walk-through for stakeholders.
    runDemoBtn.addEventListener('click', handleDemo);
}

/**
 * Handle OTP issuance
 */
function handleIssueOTP() {
    const passcode = parseInt(document.getElementById('passcode').value);
    const durationValue = durationSelect.value;
    let duration;

    // Validate passcode
    if (!passcode || passcode < 100000 || passcode > 99999999) {
        showToast('Please enter a valid 6-8 digit passcode', 'Invalid Input', 'error');
        return;
    }

    // Get duration
    if (durationValue === 'custom') {
        duration = parseInt(document.getElementById('customDuration').value);
        if (!duration || duration < 1000 || duration > 300000) {
            showToast('Custom duration must be between 1,000ms and 300,000ms (5 minutes)', 'Invalid Duration', 'error');
            return;
        }
    } else {
        duration = parseInt(durationValue);
    }

    try {
        // Issue OTP
        // Core business call: delegate to the shared store to persist the OTP.
        const wasExisting = otpStore.issue(passcode, duration);

        // Update active OTPs tracking
        addToActiveOTPs(passcode, duration, wasExisting);

        // Show feedback - highlight whether we extended an existing key or
        // created a new one so analysts understand the state change.
        const message = wasExisting ?
            `OTP ${passcode} duration updated to ${formatDuration(duration)}` :
            `New OTP ${passcode} issued for ${formatDuration(duration)}`;

        showToast(message, 'OTP Issued', 'success');
        updateStatus(`${wasExisting ? 'Updated' : 'Issued'} OTP: ${passcode}`, 'success');
        
        // Clear form so operators can rapidly issue multiple keys
        document.getElementById('passcode').value = '';

        // Update display
        updateOTPList();

    } catch (error) {
        console.error('Error issuing OTP:', error);
        showToast('Failed to issue OTP', 'Error', 'error');
    }
}

/**
 * Handle OTP authentication
 */
function handleAuthentication() {
    const passcode = parseInt(document.getElementById('authPasscode').value);
    
    // Basic guard to avoid unnecessary round-trips to the OTP store.
    if (!passcode) {
        showToast('Please enter a passcode', 'Invalid Input', 'error');
        return;
    }

    try {
        // Attempt to redeem the passcode. The OTP store encapsulates expiry and
        // single-use concerns so the UI simply reacts to the boolean result.
        const isValid = otpStore.useOnce(passcode);
        
        if (isValid) {
            showToast(`Authentication successful for OTP ${passcode}`, 'Login Accepted', 'success');
            updateStatus(`✅ Authentication successful: ${passcode}`, 'success');
            
            // Mark as used in tracking
            if (activeOTPs.has(passcode)) {
                const otpData = activeOTPs.get(passcode);
                otpData.used = true;
                activeOTPs.set(passcode, otpData);
            }
        } else {
            showToast(`Authentication failed for OTP ${passcode}`, 'Login Rejected', 'error');
            updateStatus(`❌ Authentication failed: ${passcode}`, 'error');
        }
        
        // Clear form
        document.getElementById('authPasscode').value = '';

        // Update display
        updateOTPList();

    } catch (error) {
        console.error('Error during authentication:', error);
        showToast('Authentication error occurred', 'Error', 'error');
    }
}

/**
 * Add OTP to active tracking with timer
 */
function addToActiveOTPs(passcode, duration, wasExisting) {
    const now = Date.now();
    const expiresAt = now + duration;

    // Clear existing timer if any
    if (timers.has(passcode)) {
        clearInterval(timers.get(passcode));
    }

    // Add to active OTPs
    activeOTPs.set(passcode, {
        passcode: passcode,
        duration: duration,
        issuedAt: now,
        expiresAt: expiresAt,
        used: false,
        wasExisting: wasExisting
    });

    // Setup timer for updates
    const timer = setInterval(() => {
        updateOTPTimer(passcode);
    }, 1000);

    timers.set(passcode, timer);

    // Setup expiration cleanup - ensures the UI stays in sync even if the user
    // never visits the authenticate tab again.
    setTimeout(() => {
        if (activeOTPs.has(passcode)) {
            activeOTPs.delete(passcode);
            if (timers.has(passcode)) {
                clearInterval(timers.get(passcode));
                timers.delete(passcode);
            }
            updateOTPList();
        }
    }, duration);
}

/**
 * Update OTP timer display
 */
function updateOTPTimer(passcode) {
    const otpData = activeOTPs.get(passcode);
    if (!otpData) return;

    const now = Date.now();
    const remaining = Math.max(0, otpData.expiresAt - now);

    if (remaining === 0 || otpData.used) {
        // Expired or used
        activeOTPs.delete(passcode);
        if (timers.has(passcode)) {
            clearInterval(timers.get(passcode));
            timers.delete(passcode);
        }
        updateOTPList();
        return;
    }
    
    // Update progress bar - visual countdown of remaining validity.
    const element = document.querySelector(`[data-passcode="${passcode}"] .timer-progress`);
    if (element) {
        const progress = (remaining / otpData.duration) * 100;
        element.style.width = `${progress}%`;

        // Update color based on remaining time
        element.className = 'timer-progress';
        if (progress < 25) {
            element.classList.add('danger');
        } else if (progress < 50) {
            element.classList.add('warning');
        }
    }

    // Update time text
    const timeElement = document.querySelector(`[data-passcode="${passcode}"] .time-remaining`);
    if (timeElement) {
        timeElement.textContent = formatTimeRemaining(remaining);
    }
}

/**
 * Update the OTP list display
 */
function updateOTPList() {
    if (activeOTPs.size === 0) {
        otpList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No active OTPs</p>
                <small>Issue a new OTP to get started</small>
            </div>
        `;
        return;
    }
    
    const otpItems = Array.from(activeOTPs.values()).map(otp => {
        const now = Date.now();
        const remaining = Math.max(0, otp.expiresAt - now);
        const progress = (remaining / otp.duration) * 100;
        
        let statusClass = '';
        let statusText = '';
        
        // Derive contextual status messaging for the card so operators get an
        // immediate visual cue about what happened to the OTP (consumed vs expired).
        if (otp.used) {
            statusClass = 'text-danger';
            statusText = '🔒 Used';
        } else if (remaining === 0) {
            statusClass = 'text-danger';
            statusText = '⏰ Expired';
        } else {
            statusClass = 'text-success';
            statusText = '✅ Active';
        }

        // Adjust progress bar color as the OTP nears expiration.
        let progressClass = 'timer-progress';
        if (progress < 25) progressClass += ' danger';
        else if (progress < 50) progressClass += ' warning';
        
        return `
            <div class="otp-item" data-passcode="${otp.passcode}">
                <div class="otp-info">
                    <div class="otp-code">${otp.passcode}</div>
                    <div class="otp-status ${statusClass}">${statusText}</div>
                </div>
                <div class="otp-timer">
                    <span class="time-remaining">${formatTimeRemaining(remaining)}</span>
                    <div class="timer-bar">
                        <div class="${progressClass}" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    otpList.innerHTML = otpItems;
}

/**
 * Handle demo functionality
 */
async function handleDemo() {
    const btn = runDemoBtn;
    const originalText = btn.innerHTML;

    try {
        // Lock the button so the scenario cannot be triggered multiple times.
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner spinner"></i> Running Demo...';
        
        // Step 1: Issue demo OTP
        showToast('Demo Step 1: Issuing OTP 999888', 'Demo', 'success');
        await delay(1000);
        
        const demoPasscode = 999888;
        const demoDuration = 30000; // 30 seconds
        
        otpStore.issue(demoPasscode, demoDuration);
        addToActiveOTPs(demoPasscode, demoDuration, false);
        updateOTPList();
        updateStatus(`Demo: Issued OTP ${demoPasscode}`, 'success');
        
        await delay(2000);
        
        // Step 2: Authenticate with demo OTP
        showToast('Demo Step 2: Authenticating with OTP', 'Demo', 'success');
        await delay(1000);
        
        // Use the shared logic to simulate the real authentication flow.
        const authResult = otpStore.useOnce(demoPasscode);
        if (authResult) {
            if (activeOTPs.has(demoPasscode)) {
                const otpData = activeOTPs.get(demoPasscode);
                otpData.used = true;
                activeOTPs.set(demoPasscode, otpData);
            }
            updateOTPList();
            updateStatus(`Demo: Authentication successful`, 'success');
            showToast('Demo Step 2: Authentication successful!', 'Demo', 'success');
        }
        
        await delay(2000);
        
        // Step 3: Try to use again
        showToast('Demo Step 3: Attempting to reuse OTP', 'Demo', 'warning');
        await delay(1000);
        
        const secondAuth = otpStore.useOnce(demoPasscode);
        if (!secondAuth) {
            updateStatus(`Demo: Second authentication rejected (single-use)`, 'warning');
            showToast('Demo Step 3: Second use rejected - Single use enforced!', 'Demo', 'warning');
        }
        
        showToast('Demo completed successfully!', 'Demo Finished', 'success');
        
    } catch (error) {
        console.error('Demo error:', error);
        showToast('Demo encountered an error', 'Demo Error', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Update status display
 */
function updateStatus(message, type = 'info') {
    const statusItem = document.createElement('div');
    statusItem.className = 'status-item';

    let icon, textClass;
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            textClass = 'text-success';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            textClass = 'text-warning';
            break;
        case 'error':
            icon = 'fas fa-times-circle';
            textClass = 'text-danger';
            break;
        default:
            icon = 'fas fa-info-circle';
            textClass = '';
    }
    
    statusItem.innerHTML = `
        <i class="${icon} ${textClass}"></i>
        <span>${message}</span>
        <small>${new Date().toLocaleTimeString()}</small>
    `;
    
    // Add to status content (keep only last 5 items)
    statusContent.appendChild(statusItem);
    while (statusContent.children.length > 5) {
        statusContent.removeChild(statusContent.firstChild);
    }
}

/**
 * Show toast notification
 */
function showToast(message, title = 'Notification', type = 'info') {
    const toast = document.getElementById('toast');
    const titleEl = toast.querySelector('.toast-title');
    const textEl = toast.querySelector('.toast-text');
    const iconEl = toast.querySelector('.toast-icon i');
    
    titleEl.textContent = title;
    textEl.textContent = message;
    
    // Update icon based on type
    iconEl.className = '';
    switch (type) {
        case 'success':
            iconEl.className = 'fas fa-check-circle';
            toast.querySelector('.toast-icon').className = 'toast-icon success';
            break;
        case 'warning':
            iconEl.className = 'fas fa-exclamation-triangle';
            toast.querySelector('.toast-icon').className = 'toast-icon warning';
            break;
        case 'error':
            iconEl.className = 'fas fa-times-circle';
            toast.querySelector('.toast-icon').className = 'toast-icon error';
            break;
        default:
            iconEl.className = 'fas fa-info-circle';
            toast.querySelector('.toast-icon').className = 'toast-icon';
    }
    
    toast.classList.add('show');
    
    // Auto hide after 4 seconds
    setTimeout(() => {
        hideToast();
    }, 4000);
}

/**
 * Hide toast notification
 */
function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
}

/**
 * Format duration in a human-readable way
 */
function formatDuration(ms) {
    if (ms >= 60000) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    } else {
        const seconds = Math.floor(ms / 1000);
        return `${seconds}s`;
    }
}

/**
 * Format time remaining
 */
function formatTimeRemaining(ms) {
    if (ms <= 0) return '0s';
    return formatDuration(ms);
}

/**
 * Utility function for delays
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Auto-refresh OTP list every second - keeps card timers accurate even when
// nothing else triggers a re-render.
setInterval(() => {
    if (activeOTPs.size > 0) {
        updateOTPList();
    }
}, 1000);