// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered: ', registration);
            })
            .catch(registrationError => {
                console.log('Service Worker registration failed: ', registrationError);
            });
    });
}

const upiDataKey = 'upiData';
const historyKey = 'upiHistory';
const lastSelectedUpiKey = 'lastSelectedUpi'; // NEW: Key for saving the last selected UPI ID
 
// --- UPI Logo Library ---
const FULL_LOGO_LIBRARY = [
    // Updated Logo list for the Edit Modal
    { "name": "Axis Bank", "logo": "https://od.lk/s/NDJfNDk1Njc4NjVf/Axis.png" },
    { "name": "PhonePe Business", "logo": "https://od.lk/s/NDJfNDk1Njc4NjRf/B.Phonepe.png" },
    { "name": "BHIM", "logo": "https://od.lk/s/NDJfNDk1Njc4NjNf/Bhim%20.png" },
    { "name": "CRED", "logo": "https://od.lk/s/NDJfNDk1Njc4NjJf/cred.png" },
    { "name": "Google Pay", "logo": "https://od.lk/s/NDJfNDk1Njc4NjFf/Google%20Pay.png" },
    { "name": "Mobikwik", "logo": "https://od.lk/s/NDJfNDk1Njc4NjBf/Mobikwik.png" },
    { "name": "Paytm", "logo": "https://od.lk/s/NDJfNDk1Njc4NTlf/Paytm.png" },
    { "name": "PhonePe", "logo": "https://od.lk/s/NDJfNDk1Njc4NThf/Phonepe.png" },
    { "name": "Super.Money", "logo": "https://od.lk/s/NDJfNDk1Njc4NTdf/Super.money.png" },
    { "name": "BharatPe", "logo": "https://od.lk/s/NDJfNDk5MDE3MzFf/BharatPe.png" },
    { "name": "SBI", "logo": "https://od.lk/s/NDJfNDk5MDE3MzBf/SBI.png" },
    // Keep a generic icon for maximum flexibility
    { "name": "Generic Icon", "logo": "https://placehold.co/40x40/4B5563/D1D5DB?text=Icon" }
];
 
// --- Hardcoded initial data for local storage ---
const INITIAL_UPI_DATA = [{
    "id": "9492416477@upi",
    "label": "TVR",
    "icon": "https://ucarecdn.com/19a5ba37-4a18-471f-a5d8-5e9689551355/-/format/auto/",
    "color": "#ef4444", // Using Red accent for TVR
    "oppositeColor": "#46b6e0",
    "iconBg": "#ffffff",
    "iconBorder": "#e05244"
}, {
    "id": "9885848524@upi",
    "label": "TSK",
    "icon": "https://img.icons8.com/color/512/bhim.png",
    "color": "#018b3d", // TSK Green
    "oppositeColor": "#ff7909",
    "iconBg": "#ffffff",
    "iconBorder": "#018b3d"
}, {
    "id": "9398096059@superyes",
    "label": "BGV",
    "icon": "https://ucarecdn.com/caa1a595-b532-46b1-b4d4-1c5e21486b85/-/format/webp/-/quality/smart/",
    "color": "#4d43fe", // BGV is Blue
    "oppositeColor": "#ffffff",
    "iconBg": "#ffffff",
    "iconBorder": "#4d43fe"
}, {
    "id": "Q639488204@ybl",
    "label": "PhonePe",
    "icon": "https://img.utdstc.com/icon/a06/2b4/a062b4fb17896e98996ae80f05de6ceeafda19e3247c92d495214dbc1ea4f050:200",
    "color": "#017c07", // PhonePe is Green
    "oppositeColor": "#ffffff",
    "iconBg": "#ffffff",
    "iconBorder": "#017c07"
}];

// Load data from localStorage or use initial defaults
let upiData = JSON.parse(localStorage.getItem(upiDataKey)) || JSON.parse(JSON.stringify(INITIAL_UPI_DATA));
 
// A global variable to track the currently selected UPI ID
// CHANGE: Initialize with null so the header displays the default "---" text.
let selectedUpiId = null; 
 
// A new global variable to hold the amount for the QR code
let currentQrAmount = '';
 
// Variable to track the logo selected in the edit modal
let selectedLogoUrl = ''; 
 
// Duration for long press/hold
const LONG_PRESS_DURATION = 500;

// NEW: Map numbers to notes for a musical scale (C Major Pentatonic)
const NoteMap = {
    '1': 'C4', '2': 'D4', '3': 'E4',
    '4': 'G4', '5': 'A4', '6': 'C5',
    '7': 'D5', '8': 'E5', '9': 'G5',
    '0': 'A3', // Lower A for zero
    '.': 'A5', // Higher A for decimal point
    '(': 'B5', // Parentheses for higher pitch
    ')': 'G5'
};

// --- Start of Promoted Helper Functions (All functions needed globally) ---

const getUpiData = (id) => {
    return upiData.find(u => u.id === id) || {
        id,
        label: id,
        icon: 'https://placehold.co/40x40/4B5563/D1D5DB?text=Icon',
        color: '#ccc',
        oppositeColor: '#ccc',
        iconBg: '#fff',
        iconBorder: '#ccc'
    };
};
 
const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
};
 
const saveUpiData = () => {
    localStorage.setItem(upiDataKey, JSON.stringify(upiData));
};
 
const saveHistory = (id, amount) => {
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const timestamp = new Date().toLocaleString('en-IN', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
    // Only save if a UPI ID is selected and amount is a non-empty string (including '0.00' if a math operation resulted in zero, though my new logic returns '' for zero)
    if (id) {
        history.unshift({
            id,
            amount: amount || '0.00', // Ensure amount is saved as '0.00' if it's explicitly empty for history visibility
            timestamp
        });
        localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 10)));
    }
};
 
const validateExpression = (expression) => {
    if (expression.trim() === '') {
        return { isValid: true, message: '' };
    }
    const invalidChars = expression.match(/[^0-9\+\-\*\/\.\(\)]/g);
    if (invalidChars) {
        return { isValid: false, message: `Invalid character(s) found: ${[...new Set(invalidChars)].join('')}` };
    }

    // Check for consecutive operators (except for unary minus)
    if (expression.match(/[\+\*\/\.]{2,}/) || expression.match(/\/\*|\*\//) || expression.match(/[\+\*\/]\-/)) {
        return { isValid: false, message: 'Consecutive operators are not allowed.' };
    }
    
    // Check for leading operators that are not a minus sign
    if (expression.match(/^[\+\*\/\.]{1}/)) {
         return { isValid: false, message: 'Expression cannot start with this operator.' };
    }

    // Check for unmatched parentheses
    let parenthesisCount = 0;
    for (let char of expression) {
        if (char === '(') parenthesisCount++;
        if (char === ')') parenthesisCount--;
        if (parenthesisCount < 0) {
            return { isValid: false, message: 'Unmatched parenthesis.' };
        }
    }
    if (parenthesisCount !== 0) {
         return { isValid: false, message: 'Unmatched parenthesis.' };
    }

    return { isValid: true, message: '' };
};

const calculateAmount = (value) => {
    // 1. Explicitly allow empty input, returning an empty string amount.
    if (value.trim() === '') {
        return { result: '', error: null }; 
    }
    
    const validation = validateExpression(value);
    if (!validation.isValid) {
        return { result: '', error: validation.message };
    }
    try {
        // Check if mathjs is available before using it
        if (typeof math === 'undefined' || !math.evaluate) {
            return { result: '', error: 'Calculator library not loaded.' };
        }
        
        const result = math.evaluate(value);
        
        // 2. Handle calculation results of zero (e.g., 5-5) as optional amount ('').
        if (result === 0) {
            return { result: '', error: null };
        }
        
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            // Standard success path (non-zero amount)
            return { result: parseFloat(result).toFixed(2), error: null };
        }
    } catch (error) {
        // Calculation failed (e.g., division by zero)
        return { result: '', error: 'Invalid mathematical expression.' };
    }
    // Should not be reached, but fallback for safety
    return { result: '', error: 'Invalid mathematical expression.' };
};
 
let currentQR = null;
 
const generateQrCode = (upiId, amount) => {
    const qrCodeContainer = document.getElementById('qr-code-container');
    const amountDisplay = document.getElementById('amount-display');
    const amountValue = document.getElementById('amount-value');

    // Remove existing QR to allow a fresh generation
    qrCodeContainer.innerHTML = '';
    
    // Set initial state for instant visibility (or the modal fade will handle it)
    qrCodeContainer.classList.remove('hidden');

    const upi = getUpiData(upiId);
    
    // NEW: Use a list of predefined vibrant color palettes for QR codes
    const colorPalettes = [
        ["#1BE7FF", "#6EEB83", "#E4FF1A"],
        ["#F2F3AE", "#EDD382", "#FC9E4F"],
        ["#C5F9D7", "#F7D486", "#F27A7D"],
        ["#DEEFB7", "#98DFAF", "#5FB49C"],
        ["#F08700", "#F49F0A", "#EFCA08"],
        ["#FFFD82", "#FF9B71", "#E84855"],
        ["#FF5C4D", "#FF9636", "#FFCD58"],
        ["#FF8370", "#00B1B0", "#FEC84D"],
        ["#FEDE00", "#B4F8C8", "#6AB8EE"]
    ];

    // Randomly select a palette
    const selectedPalette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
    
    // Map the palette colors to QR code components
    const dotsColor = selectedPalette[0];
    const cornersSquareColor = selectedPalette[1];
    const cornersDotColor = selectedPalette[2];

    const dotsOptionsTypes = ["dots", "rounded", "extra-rounded", "square", "circular", "edge-cut-smooth", "leaf", "pointed-edge-cut", "pointed-in-smooth", "pointed-smooth", "round", "rounded-in-smooth", "rounded-pointed", "star", "diamond", "doted-light", "classy", "classy-rounded"];
    const cornersSquareOptionsTypes = ["square", "extra-rounded", "dot", "round", "bevel", "bubble"];
    const cornersDotOptionsTypes = ["square", "dot", "round", "bevel", "bubble"];
    
    const randomDotsType = dotsOptionsTypes[Math.floor(Math.random() * dotsOptionsTypes.length)];
    const randomCornersSquareType = cornersSquareOptionsTypes[Math.floor(Math.random() * cornersSquareOptionsTypes.length)];
    const randomCornersDotType = cornersDotOptionsTypes[Math.floor(Math.random() * cornersDotOptionsTypes.length)];

    const payeeName = upi.label;
    const upiIcon = upi.icon;

    let upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}`;
    if (payeeName) {
        upiUri += `&pn=${encodeURIComponent(payeeName)}`;
    }
    
    // CHECK FOR AMOUNT: Only append amount parameter if amount is a valid number greater than 0
    if (amount && parseFloat(amount) > 0) {
        upiUri += `&am=${encodeURIComponent(amount)}`;
        upiUri += `&cu=INR`;
    }
    
    currentQR = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "svg",
        data: upiUri,
        image: upiIcon,
        dotsOptions: {
            color: dotsColor,
            type: randomDotsType
        },
        cornersSquareOptions: {
            color: cornersSquareColor,
            type: randomCornersSquareType
        },
        cornersDotOptions: {
            color: cornersDotColor,
            type: randomCornersDotType
        },
        backgroundOptions: {
            color: "#000000",
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 5,
            imageSize: 0.3, // Slightly increased image size
            hideBackgroundDots: true // This is the key line to hide the dots under the image
        }
    });

    currentQR.append(qrCodeContainer);
    
    // If amount is present and > 0, display the amount pill
    if (amount && parseFloat(amount) > 0 && !isNaN(parseFloat(amount))) {
        amountValue.textContent = `${parseFloat(amount).toFixed(2)}`;
        amountDisplay.classList.remove('hidden');
    } else {
        amountDisplay.classList.add('hidden');
    }
};
 
const showQrModal = (upiId, amount) => {
    const qrModalOverlay = document.getElementById('qr-modal-overlay');
    const historyBtn = document.getElementById('history-btn');
    const floatingHeader = document.getElementById('floating-header'); // Get header ref
    
    if (!upiId) {
        console.error("Cannot show QR modal: UPI ID not selected.");
        return;
    }

    // HIDE HISTORY BUTTON AND FLOATING HEADER
    historyBtn.classList.add('hidden');
    floatingHeader.classList.add('hidden');

    // NEW: Highlight the selected button across both views BEFORE showing modal
    updateButtonHighlighting(upiId);

    // 1. Generate the QR code first
    generateQrCode(upiId, amount);
    
    // 2. Set the overlay to be visible (flex) but transparent (opacity: 0 by default)
    qrModalOverlay.classList.remove('hidden'); 

    // 3. Use requestAnimationFrame to force a repaint and then apply the 'visible' class
    window.requestAnimationFrame(() => {
        qrModalOverlay.classList.add('visible');
    });
};
 
// Helper function to update UPI ID display in the header
const updateHeaderUpiDisplay = (upiId) => {
    const upiLabelText = document.getElementById('upi-label-text');
    const selectedUpiIdDisplay = document.getElementById('selected-upi-id');
    
    // CHANGE: Check if upiId is null/falsy, and display default state if it is.
    if (!upiId) {
        upiLabelText.textContent = 'Select a UPI ID:';
        selectedUpiIdDisplay.textContent = '---';
        return;
    }

    const upiInfo = getUpiData(upiId);
    // Display selected UPI ID details
    upiLabelText.textContent = upiInfo.label;
    selectedUpiIdDisplay.textContent = upiInfo.id;
};

const updateButtonHighlighting = (id) => {
    selectedUpiId = id;
    document.querySelectorAll('.upi-btn-base').forEach(btn => {
        btn.classList.remove('upi-btn-active-glow');
        btn.style.transform = 'scale(1.0)'; // Ensure base transforms are reset
    });
    document.querySelectorAll('.popup-upi-btn').forEach(btn => {
        btn.classList.remove('popup-upi-btn-active');
    });
    
    if (id) {
        const upi = getUpiData(id);

        const mainBtn = document.querySelector(`#upi-button-container [data-upi-id="${id}"]`);
        if (mainBtn) {
            mainBtn.classList.add('upi-btn-active-glow');
        }
        
        const popupBtn = document.querySelector(`#popup-upi-buttons [data-upi-id="${id}"]`);
        if (popupBtn) {
            popupBtn.classList.add('popup-upi-btn-active');
            popupBtn.style.setProperty('--upi-color', upi.color);
            popupBtn.style.setProperty('--upi-opposite-color', upi.oppositeColor);
            // NEW: Also set the RGB variable for the popup button glow
            popupBtn.style.setProperty('--upi-rgb', hexToRgb(upi.color));
        }
    }
};
 
// NEW: Function to update the live preview in the Edit Modal
const updateEditPreview = (upi) => {
    const upiIdInput = document.getElementById('edit-upi-id').value.trim();
    const upiLabelInput = document.getElementById('edit-upi-label').value.trim();
    
    document.getElementById('edit-current-logo').src = selectedLogoUrl || upi.icon;
    document.getElementById('edit-current-label').textContent = upiLabelInput || upi.label;
    document.getElementById('edit-current-id-preview').textContent = upiIdInput || upi.id;
};

const populateEditFields = (upi) => {
    document.getElementById('edit-upi-id').value = upi.id;
    document.getElementById('edit-upi-label').value = upi.label;
    
    // Initialize global selectedLogoUrl to current icon
    selectedLogoUrl = upi.icon; 

    // Initialize Preview Card
    document.getElementById('edit-current-logo').src = upi.icon;
    document.getElementById('edit-current-label').textContent = upi.label;
    document.getElementById('edit-current-id-preview').textContent = upi.id;
    
    // Clear existing logo selection
    document.querySelectorAll('#logo-library .logo-option').forEach(el => el.classList.remove('selected-logo'));
    
    // Re-select the currently active logo in the library
    const selectedEl = document.querySelector(`#logo-library [data-logo-url="${upi.icon}"]`);
    if (selectedEl) {
         selectedEl.classList.add('selected-logo');
    }
}

const showEditModal = (upiId) => {
    const upi = upiData.find(u => u.id === upiId);
    const historyBtn = document.getElementById('history-btn');
    const floatingHeader = document.getElementById('floating-header'); // Get header ref
    
    if (!upi) return;

    // HIDE HISTORY BUTTON AND FLOATING HEADER
    historyBtn.classList.add('hidden');
    floatingHeader.classList.add('hidden');

    const editModalOverlay = document.getElementById('edit-modal-overlay');
    
    // Store context data
    document.getElementById('editing-upi-id-original').value = upi.id;
    document.getElementById('editing-upi-index').value = upiData.indexOf(upi);
    document.getElementById('editing-upi-color').value = upi.color; 
    
    // REVERTED: Removed original data storage field

    populateEditFields(upi); // Populate fields with current values and init preview card

    // --- Populate Logo Library ---
    const logoLibraryEl = document.getElementById('logo-library');
    // Check if logos are already rendered (prevent re-rendering static list)
    if (logoLibraryEl.childElementCount === 0) {
        FULL_LOGO_LIBRARY.forEach(logoItem => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'logo-option';
            
            // Use title for accessibility/hover feedback
            imgContainer.title = logoItem.name; 
            imgContainer.setAttribute('data-logo-url', logoItem.logo);
            imgContainer.innerHTML = `<img src="${logoItem.logo}" alt="${logoItem.name} Logo" class="w-full h-auto rounded-full">`;
            
            imgContainer.addEventListener('click', () => {
                document.querySelectorAll('#logo-library .logo-option').forEach(el => el.classList.remove('selected-logo'));
                imgContainer.classList.add('selected-logo');
                selectedLogoUrl = logoItem.logo;
                updateEditPreview(upi); // Update live preview on logo change
            });
            
            logoLibraryEl.appendChild(imgContainer);
        });
    }
    
    // Re-apply selection state after ensuring the library is populated
    populateEditFields(upi);


    editModalOverlay.classList.remove('hidden');
    window.requestAnimationFrame(() => {
        editModalOverlay.classList.add('visible');
    });
};
 
const createUpiButton = (upi) => {
    const container = document.createElement('div');
    container.className = 'flex flex-col items-center gap-2';

    const button = document.createElement('button');
    button.className = 'w-[70px] h-[70px] p-0 rounded-2xl bg-gray-100 relative upi-btn-base'; 
    button.setAttribute('data-upi-id', upi.id);
    button.style.setProperty('--upi-color', upi.color);
    button.style.setProperty('--upi-rgb', hexToRgb(upi.color));

    button.innerHTML = `
        <div class="w-full h-full p-2 flex items-center justify-center rounded-2xl upi-btn-inner-shadow">
            <img src="${upi.icon}" alt="${upi.label} Icon" class="w-full h-full rounded-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/60x60/4B5563/D1D5DB?text=Icon'">
        </div>
    `;

    const label = document.createElement('span');
    label.className = 'text-xs font-bold text-gray-300';
    label.textContent = upi.label;

    container.appendChild(button);
    container.appendChild(label);
    
    // REMOVED: Automatic header update and button highlighting on initial render.
    // This is now handled by the click listener and the final call to updateHeaderUpiDisplay(null).

    let pressTimer = null;
    let pressStartTimestamp = 0;
    const upiId = upi.id; // Store ID locally for closures

    // --- Long Press / Right Click Logic ---
    
    // Universal handler for triggering the Edit Modal
    const handleEditTrigger = (e) => {
        e.preventDefault(); 
        e.stopPropagation(); 
        showEditModal(upiId);
    };

    // 1. Pointer Down (Mobile Long Press)
    button.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        
        // Start long press timer on touch devices
        if (e.pointerType === 'touch') {
            pressStartTimestamp = Date.now();
            e.preventDefault(); 

            if (pressTimer) clearTimeout(pressTimer);
            
            pressTimer = setTimeout(() => {
                handleEditTrigger(e);
                pressTimer = null; 
            }, LONG_PRESS_DURATION);
        }
    });

    // 2. Pointer Up (Mobile Touch)
    button.addEventListener('pointerup', (e) => {
        if (e.button !== 0) return;

        if (pressTimer !== null) {
            clearTimeout(pressTimer);
            pressTimer = null;
            
            const pressDuration = Date.now() - pressStartTimestamp;
            
            // If it was a short tap (< LONG_PRESS_DURATION), execute QR action
            if (e.pointerType === 'touch' && pressDuration < LONG_PRESS_DURATION) {
                e.target.closest('button').click(); // Simulate a click for the QR action
            }
        }
    });

    // 3. Right Click (Desktop)
    button.addEventListener('contextmenu', handleEditTrigger);

    // 4. Standard Click (Desktop / Mobile fall-through) - Kept for QR Generation
    button.addEventListener('click', (e) => {
        // If pressTimer is null, the click wasn't part of a short touch interaction, so process QR.
        // This handles desktop clicks and ensures standard click logic runs if long press didn't trigger.
        
        // Block touch-initiated clicks that were already handled by pointerup/pointerdown logic if they were part of a long press
        if (pressTimer === null && e.pointerType === 'touch') {
            return; 
        }
        
        const amountInput = document.getElementById('amountInput');
        const inputGroup = document.getElementById('input-container');
        const clearInputBtn = document.getElementById('clear-input-btn');
        const errorMessage = document.getElementById('errorMessage');

        // 1. Validation check and Calculation
        const inputExpression = amountInput.value.trim();
        const { result, error } = calculateAmount(inputExpression);

        // 2. Update highlighting and header display (always happens on click)
        updateButtonHighlighting(upiId);
        updateHeaderUpiDisplay(upiId);
        
        // NEW: Save the newly selected ID to localStorage
        localStorage.setItem(lastSelectedUpiKey, upiId);
        
        if (error) {
            errorMessage.style.display = 'none';
            inputGroup.classList.add('input-error');
            AudioEngine.playTone('clear'); 
            return;
        }
        
        // 3. Action on Success: Show QR modal, save history, and clear input
        errorMessage.style.display = 'none';
        inputGroup.classList.remove('input-error');
        AudioEngine.playTone('magical');
        
        currentQrAmount = result;
        
        showQrModal(upiId, result);
        saveHistory(upiId, result);

        amountInput.value = '';
        clearInputBtn.classList.add('hidden');
    });

    return container;
};

const createPopupUpiButton = (upi) => {
    const button = document.createElement('button');
    // Removed duration-300 from class list to use the faster CSS transition
    button.className = 'w-16 h-16 p-2 bg-gray-900 rounded-full flex flex-col items-center justify-center relative popup-upi-btn'; 
    button.setAttribute('data-upi-id', upi.id);
    button.style.setProperty('--upi-color', upi.color);
    button.style.setProperty('--upi-rgb', hexToRgb(upi.color));

    button.innerHTML = `
        <img src="${upi.icon}" alt="${upi.label} Icon" class="w-10 h-10 rounded-full" onerror="this.onerror=null;this.src='https://placehold.co/40x40/4B5563?text=Icon'">
    `;
    button.addEventListener('click', () => {
        
        AudioEngine.playTone('magical'); 
        
        const amount = currentQrAmount;
        
        // Update header display on button click inside modal
        updateHeaderUpiDisplay(upi.id);
        
        // NEW: Save the newly selected ID to localStorage
        localStorage.setItem(lastSelectedUpiKey, upi.id);
        
        showQrModal(upi.id, amount);
        saveHistory(upi.id, amount);
    });
    return button;
};
 
// START RENDER HISTORY (Modified for Swipe-to-Delete)
const renderHistory = () => {
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    historyList.innerHTML = '';
    
    // Swipe sensitivity (in pixels)
    const swipeThreshold = 60; 

    if (history.length === 0) {
        historyList.innerHTML = '<p class="text-gray-400 text-center">No payment history found.</p>';
        clearHistoryBtn.classList.add('hidden');
    } else {
        history.forEach((item, index) => {
            const upiInfo = getUpiData(item.id);
            
            // Use a single container div with all necessary classes
            const historyItem = document.createElement('div');
            historyItem.classList.add(
                'history-item', 'relative', 'group', 'p-0', 'rounded-xl', 'w-full'
            );
            historyItem.style.borderLeft = `5px solid ${upiInfo.color}`; 
            // Setting background on the inner wrapper for visual consistency on swipe
            // historyItem.style.backgroundColor = '#1f2125'; 

            const itemIconUrl = upiInfo.icon || 'https://placehold.co/40x40/4B5563?text=Icon';
            const timePart = item.timestamp.split(', ')[1] || item.timestamp;

            // --- 1. ACTIONS (Behind the swipe wrapper) ---
            const actions = document.createElement('div');
            actions.className = 'history-item-actions flex items-center space-x-2 history-item-actions-wrapper transition-opacity duration-300';
            actions.innerHTML = `
                <button class="regenerate-btn history-action-btn" title="Generate QR again">
                    <span class="material-symbols-outlined text-base">sync</span>
                </button>
                <button class="delete-btn history-action-btn" title="Delete entry" data-index="${index}">
                    <span class="material-symbols-outlined text-base">delete</span>
                </button>
            `;
            
            // --- 2. SWIPE WRAPPER (The visible, moveable content) ---
            const swipeWrapper = document.createElement('div');
            // 'w-full flex items-center space-x-4 pr-16' replaces the classes on the original outer item
            swipeWrapper.className = 'history-swipe-wrapper w-full flex items-center space-x-4 pr-16';
            swipeWrapper.innerHTML = `
                <!-- Icon -->
                <img src="${itemIconUrl}" alt="${upiInfo.label} Icon" 
                    class="w-10 h-10 rounded-full border-2 border-gray-700 object-cover flex-shrink-0" 
                    onerror="this.onerror=null;this.src='https://placehold.co/40x40/4B5563?text=Icon'">
                
                <!-- Text Content (Label and Time/Amount) -->
                <div class="flex-1 min-w-0 ml-2">
                    <p class="text-gray-200 font-semibold truncate" style="font-family: 'Karla', sans-serif;">${upiInfo.label}</p>
                    <p class="text-gray-400 text-sm truncate" style="font-family: 'Karla', sans-serif;">₹${item.amount} - ${timePart}</p>
                </div>
            `;

            // APPEND CONTENT AND ACTIONS
            historyItem.appendChild(actions);
            historyItem.appendChild(swipeWrapper);

            // --- SWIPE LOGIC ---
            let startX = 0;
            let isSwiping = false;
            
            historyItem.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                isSwiping = false;
                swipeWrapper.style.transition = 'none'; // Disable transition during swipe
            });
            
            historyItem.addEventListener('touchmove', (e) => {
                const currentX = e.touches[0].clientX;
                const diffX = currentX - startX;
            
                // Only track left-swipe (diffX < 0) and limit the maximum reveal distance
                if (diffX < -10) { 
                    isSwiping = true;
                    // Limit swipe distance to -swipeThreshold (e.g., -60px)
                    const translateX = Math.max(-swipeThreshold, diffX); 
                    swipeWrapper.style.transform = `translateX(${translateX}px)`;
                    actions.style.opacity = 1;
                } else if (swipeWrapper.style.transform !== 'translateX(0px)' && diffX > 0) {
                    // Allow reset move to the right, limiting back to 0
                    swipeWrapper.style.transform = `translateX(${Math.min(0, currentX - startX)}px)`;
                    // Calculate opacity fade based on distance
                    actions.style.opacity = Math.max(0, 1 - (Math.abs(currentX - startX) / swipeThreshold));
                }
            });

            historyItem.addEventListener('touchend', () => {
                swipeWrapper.style.transition = 'transform 0.3s ease-out';
                // Get the current transform position
                const currentTransformMatch = swipeWrapper.style.transform.match(/translateX\(([-+]?\d*\.?\d+)px\)/);
                const currentDiff = currentTransformMatch ? parseFloat(currentTransformMatch[1]) : 0;

                if (currentDiff < -swipeThreshold / 2) {
                    // Snap open
                    swipeWrapper.style.transform = `translateX(-${swipeThreshold}px)`;
                    actions.style.opacity = 1;
                } else {
                    // Snap shut
                    swipeWrapper.style.transform = 'translateX(0px)';
                    actions.style.opacity = 0;
                }
                isSwiping = false;
            });
            
            // Click listener on the content wrapper to run the main action (QR generation)
            swipeWrapper.addEventListener('click', (e) => {
                // Determine if item is in the 'open' state. Check if transform is non-zero
                const currentTransformMatch = swipeWrapper.style.transform.match(/translateX\(([-+]?\d*\.?\d+)px\)/);
                const isSwiped = currentTransformMatch && Math.abs(parseFloat(currentTransformMatch[1])) > 5;

                if (isSwiped) {
                    // If swiped, click action should snap it shut, not trigger QR.
                    e.preventDefault(); // Prevent propagation if swiped
                    swipeWrapper.style.transform = 'translateX(0px)';
                    actions.style.opacity = 0;
                    return;
                }
                
                // If not swiped, proceed with QR generation logic
                currentQrAmount = item.amount;
                updateButtonHighlighting(item.id);
                updateHeaderUpiDisplay(item.id);
                localStorage.setItem(lastSelectedUpiKey, item.id);
                showQrModal(item.id, item.amount);
            });

            // Regenerate button listener
            actions.querySelector('.regenerate-btn').addEventListener('click', () => {
                // Snap shut after action
                swipeWrapper.style.transform = 'translateX(0px)';
                actions.style.opacity = 0;
                
                currentQrAmount = item.amount;
                saveHistory(item.id, item.amount);
                updateButtonHighlighting(item.id);
                updateHeaderUpiDisplay(item.id);
                localStorage.setItem(lastSelectedUpiKey, item.id);
                showQrModal(item.id, item.amount);
            });

            // Delete button listener
            actions.querySelector('.delete-btn').addEventListener('click', () => {
                // Delete logic
                let currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
                const indexToDelete = parseInt(actions.querySelector('.delete-btn').dataset.index, 10);
                currentHistory.splice(indexToDelete, 1);
                localStorage.setItem(historyKey, JSON.stringify(currentHistory));
                
                // Trigger the vanish animation visually, then re-render
                historyItem.classList.add('history-item-vanish');
                setTimeout(renderHistory, 300); // 300ms matches the vanish animation duration
            });


            historyList.appendChild(historyItem);
        });
        clearHistoryBtn.classList.remove('hidden');
    }
};
// END RENDER HISTORY (Modified for Swipe-to-Delete)
 
// ... (rest of document.addEventListener('DOMContentLoaded', ...) remains the same)

document.addEventListener('DOMContentLoaded', () => {
    // View Management
    const mainView = document.getElementById('main-view');
    const historyView = document.getElementById('history-view');
    const historyBtn = document.getElementById('history-btn');
    const historyIcon = document.getElementById('history-icon');
    const qrModalOverlay = document.getElementById('qr-modal-overlay');
    const editModalOverlay = document.getElementById('edit-modal-overlay'); // NEW
    const historyFooter = document.getElementById('history-footer'); 
    const floatingHeader = document.getElementById('floating-header');
    
    // NEW: Get internal back button reference
    const historyBackBtn = document.getElementById('history-back-btn');
    
    // Edit Modal Element References
    const editSaveBtn = document.getElementById('edit-save-btn');
    const editCancelBtn = document.getElementById('edit-cancel-btn');
    const editUpiIdInput = document.getElementById('edit-upi-id');
    const editUpiLabelInput = document.getElementById('edit-upi-label');


    // Refactored view switching logic for a smoother animation
    const showMainView = () => {
        historyView.classList.remove('history-visible');
        historyView.classList.add('hidden');
        mainView.classList.remove('hidden');
        
        // SHOW FLOATING HEADER
        floatingHeader.classList.remove('hidden'); 
        
        // NEW: Stop gradient scroll animation when leaving history view
        if (historyFooter) {
            historyFooter.classList.remove('footer-is-visible');
        }
    };

    const showHistoryView = () => {
        historyView.classList.remove('hidden');
        mainView.classList.add('hidden');
        historyView.classList.add('history-visible');
        
        // HIDE FLOATING HEADER
        floatingHeader.classList.add('hidden'); 
        
        renderHistory();
        
        // Setup internal back button listener
        if (historyBackBtn) {
            historyBackBtn.onclick = showMainView;
        }

        // NEW: Start gradient scroll animation when entering history view
        if (historyFooter) {
            // Timeout ensures the animation starts after the element is painted/slid up
            setTimeout(() => {
                historyFooter.classList.add('footer-is-visible');
            }, 500);  
        }
    };

    // The logic for the SHARED historyBtn now needs to explicitly handle toggling views
    historyBtn.addEventListener('click', () => {
        if (historyView.classList.contains('hidden')) {
            showHistoryView();
        } else {
            // Fallback for fast clicks
            showMainView(); 
        }
    });
    
    // --- Header Shrink Scroll Listener (REVERTED) ---
    // Removed the scroll listener as the body/html overflow is now set to hidden.
    
    
    // --- Existing Logic ---
    const upiButtonContainer = document.getElementById('upi-button-container');
    const amountInput = document.getElementById('amountInput');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const clearInputBtn = document.getElementById('clear-input-btn');
    const popupUpiButtons = document.getElementById('popup-upi-buttons');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const dialPad = document.getElementById('dial-pad');
    const logoBtn = document.getElementById('logo-btn');
    const logoImg = document.getElementById('logo-img');
    const errorMessage = document.getElementById('errorMessage');
    const inputGroup = document.getElementById('input-container');

    // Ensure error display elements are clean on load
    errorMessage.style.display = 'none';
    inputGroup.classList.remove('input-error');
    
    const renderUpiButtons = () => {
        upiButtonContainer.innerHTML = '';
        popupUpiButtons.innerHTML = '';
        upiData.forEach(upi => {
            const mainBtn = createUpiButton(upi);
            const popupBtn = createPopupUpiButton(upi);
            upiButtonContainer.appendChild(mainBtn);
            popupUpiButtons.appendChild(popupBtn);
        });
    };

    // --- START Initial State Selection Logic (Refactoring for Persistence) ---
    
    // 1. Load the last saved ID from storage.
    let lastSavedId = localStorage.getItem(lastSelectedUpiKey);

    // 2. Check if the saved ID is valid (exists in current upiData).
    const isSavedIdValid = upiData.some(u => u.id === lastSavedId);

    // 3. Set the initial selectedUpiId based on validation.
    if (isSavedIdValid) {
        selectedUpiId = lastSavedId;
    } else {
        // If invalid or first load, keep selectedUpiId = null (from global scope)
        selectedUpiId = null; 
    }
    
    // 4. Render all UPI buttons
    renderUpiButtons();
    
    // 5. Apply highlighting and update the header based on the final determined state.
    updateButtonHighlighting(selectedUpiId); // This will apply highlight if selectedUpiId is not null
    updateHeaderUpiDisplay(selectedUpiId); // This displays '---' if selectedUpiId is null
    
    // --- END Initial State Selection Logic ---


    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            const historyItems = document.getElementById('history-list').querySelectorAll('.history-item');
            if (historyItems.length === 0) return;
            
            // NEW: Trigger confetti explosion before clearing
            triggerClearConfetti(clearHistoryBtn);

            const staggerTime = 50;
            let totalAnimationTime = 0;

            historyItems.forEach((item, index) => {
                // Stagger the animation start time
                setTimeout(() => {
                    item.classList.add('history-item-vanish');
                }, index * staggerTime);
                
                // Calculate the time when the last item's animation finishes (350ms is base animation duration + buffer)
                totalAnimationTime = Math.max(totalAnimationTime, (index * staggerTime) + 350);
            });

            // Clear local storage and re-render ONLY after all items have vanished
            setTimeout(() => {
                localStorage.removeItem(historyKey);
                renderHistory();
            }, totalAnimationTime);
        });
    }

    // --- QR Modal Close Listener ---
    closeModalBtn.addEventListener('click', () => {
        qrModalOverlay.classList.remove('visible');
        setTimeout(() => {
            qrModalOverlay.classList.add('hidden');
            document.getElementById('qr-code-container').innerHTML = '';
            
            // SHOW HISTORY BUTTON AND FLOATING HEADER AFTER CLOSING MODAL
            historyBtn.classList.remove('hidden');
            floatingHeader.classList.remove('hidden');
        }, 300); 
    });

    // --- Edit Modal Close Listener ---
    const hideEditModal = () => {
        editModalOverlay.classList.remove('visible');
        setTimeout(() => {
            editModalOverlay.classList.add('hidden');
            
            // SHOW HISTORY BUTTON AND FLOATING HEADER AFTER CLOSING MODAL
            historyBtn.classList.remove('hidden');
            floatingHeader.classList.remove('hidden');
        }, 300); 
    };
    
    editCancelBtn.addEventListener('click', hideEditModal);

    // --- Live preview listeners for Edit Modal ---
    // These listeners are added outside the showEditModal function to avoid adding them multiple times
    if (editUpiIdInput) {
        editUpiIdInput.addEventListener('input', () => {
            const currentUpi = upiData[parseInt(document.getElementById('editing-upi-index').value, 10)];
            updateEditPreview(currentUpi);
        });
    }

    if (editUpiLabelInput) {
        editUpiLabelInput.addEventListener('input', () => {
            const currentUpi = upiData[parseInt(document.getElementById('editing-upi-index').value, 10)];
            updateEditPreview(currentUpi);
        });
    }
    
    // --- Edit Modal Save Listener ---
    editSaveBtn.addEventListener('click', () => {
        const originalId = document.getElementById('editing-upi-id-original').value;
        const index = parseInt(document.getElementById('editing-upi-index').value, 10);
        const color = document.getElementById('editing-upi-color').value;
        
        const newId = document.getElementById('edit-upi-id').value.trim();
        const newLabel = document.getElementById('edit-upi-label').value.trim();
        const newIcon = selectedLogoUrl; // From the global tracker

        if (!newId || !newLabel || !newIcon) {
            // Simple validation check
            // Cannot use alert(), using console.error and simple visual feedback instead
            console.error("UPI ID, Label, and Icon cannot be empty.");
            document.getElementById('edit-upi-id').classList.add('input-error');
            setTimeout(() => document.getElementById('edit-upi-id').classList.remove('input-error'), 1000);
            return;
        }
        
        if (index >= 0 && index < upiData.length) {
            // Update the local data structure
            upiData[index].id = newId;
            upiData[index].label = newLabel;
            upiData[index].icon = newIcon;
            // Keep the color and other properties the same unless specified otherwise
            upiData[index].color = color;
            
            saveUpiData(); // Save to local storage
            renderUpiButtons(); // Re-render buttons immediately
            
            // If the currently selected ID changed, update the selection too
            if (selectedUpiId === originalId) {
                updateButtonHighlighting(newId);
                updateHeaderUpiDisplay(newId);
                localStorage.setItem(lastSelectedUpiKey, newId); // Update persistent state
            }

            hideEditModal(); // Close the modal
        }
    });


    // UPDATED: Live validation on input (Red Border only)
    amountInput.addEventListener('input', () => {
        const validation = validateExpression(amountInput.value);
        if (!validation.isValid) {
            // Show red border, hide text
            errorMessage.style.display = 'none';
            inputGroup.classList.add('input-error');
        } else {
            // Clear state
            errorMessage.style.display = 'none';
            inputGroup.classList.remove('input-error');
        }
        
        if (amountInput.value.length > 0) {
            clearInputBtn.classList.remove('hidden');
        } else {
            clearInputBtn.classList.add('hidden');
        }
    });

    clearInputBtn.addEventListener('click', () => {
        amountInput.value = '';
        clearInputBtn.classList.add('hidden');
        errorMessage.style.display = 'none'; // Ensure error message stays hidden
        inputGroup.classList.remove('input-error'); // Ensure error border is removed
        amountInput.focus();
    });

    // UPDATED: Calculator functionality on blur (Red Border only)
    amountInput.addEventListener('blur', (e) => {
        const { result, error } = calculateAmount(e.target.value.trim());
        let toneType = null;

        if (error) {
            // Action on Error: ONLY SHOW RED BORDER, HIDE TEXT, PLAY TONE
            errorMessage.style.display = 'none';
            inputGroup.classList.add('input-error');
            e.target.value = ''; 
            toneType = 'clear'; // Use clear tone on error
        } else {
            // Only set result if it's a valid calculation
            if (result) {
                    amountInput.value = result;
                    toneType = 'equals';
                } else {
                    // If result is empty (''), clear input but treat as successful 'zero' calculation
                    amountInput.value = '';
                    toneType = 'clear'; // Use clear tone to acknowledge the action
                }
            // Clear error state if successful
            errorMessage.style.display = 'none';
            inputGroup.classList.remove('input-error');
        }
        
        // Play the tone after processing
        if (toneType) {
            AudioEngine.playTone(toneType);
        }

        // Set clear button visibility based on final value
        e.target.value.length > 0 ? clearInputBtn.classList.remove('hidden') : clearInputBtn.classList.add('hidden');
    });
    
    // 1. Initialize synths once
    AudioEngine.initSynths();

    // 2. Start context on the very first interaction with the dial pad (Fix for Auto-Play Policy)
    const startAudioOnFirstInteraction = () => {
        AudioEngine.startContext();
        // Remove the listener after the first successful interaction
        dialPad.removeEventListener('mousedown', startAudioOnFirstInteraction);
        dialPad.removeEventListener('touchstart', startAudioOnFirstInteraction);
    };

    dialPad.addEventListener('mousedown', startAudioOnFirstInteraction, { once: true });
    dialPad.addEventListener('touchstart', startAudioOnFirstInteraction, { once: true });

    // UPDATED: Dial pad functionality (Red Border only)
    dialPad.addEventListener('click', (e) => {
        e.preventDefault();
        const button = e.target.closest('button');
        if (!button) return;

        const value = button.dataset.value;
        const operators = ['+', '-', '*', '/']; 
        const musicalKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '(', ')'];
        let toneType = null;

        if (musicalKeys.includes(value)) {
            amountInput.value += value;
            toneType = 'number';  
        } else if (operators.includes(value)) {
            amountInput.value += value;
            toneType = 'operator';  
        } else if (value === 'backspace') {
            amountInput.value = amountInput.value.slice(0, -1);
            toneType = 'backspace';
        } else if (value === 'clear') {
            amountInput.value = '';
            toneType = 'clear';
        } else if (value === 'equals') {
            const { result, error } = calculateAmount(amountInput.value.trim());

            if (error) {
                // Action on Error: ONLY SHOW RED BORDER, HIDE TEXT, PLAY TONE
                errorMessage.style.display = 'none';
                inputGroup.classList.add('input-error');
                AudioEngine.playTone('clear'); 
                return;
            } else {
                // Only set result if it's a valid calculation
                if (result) {
                    amountInput.value = result;
                    toneType = 'equals';
                } else {
                    // If result is empty (''), clear input but treat as successful 'zero' calculation
                    amountInput.value = '';
                    toneType = 'clear'; // Use clear tone to acknowledge the action
                }
            }
            // Clear error state if successful
            errorMessage.style.display = 'none';
            inputGroup.classList.remove('input-error');
        }
        
        // Play the tone after processing, passing the specific button value
        if (toneType) {
            AudioEngine.playTone(toneType, value);
        }


        if (amountInput.value.length > 0) {
            clearInputBtn.classList.remove('hidden');
        } else {
            clearInputBtn.classList.add('hidden');
        }
        
        // Live input validation after button press (Red Border only)
        const validation = validateExpression(amountInput.value);
        if (!validation.isValid) {
            errorMessage.style.display = 'none';
            inputGroup.classList.add('input-error');
        } else {
            errorMessage.style.display = 'none';
            inputGroup.classList.remove('input-error');
        }
    });
    
    logoBtn.addEventListener('click', () => {
        logoImg.style.opacity = '0';
        setTimeout(() => {
            window.location.reload(true);
        }, 500);
    });
    
});
