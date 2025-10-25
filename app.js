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
    if (!upiId) {
        console.error("Cannot show QR modal: UPI ID not selected.");
        return;
    }

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
    if (!upi) return;

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
 
const renderHistory = () => {
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    historyList.innerHTML = '';
    if (history.length === 0) {
        historyList.innerHTML = '<p class="text-gray-400 text-center">No payment history found.</p>';
        clearHistoryBtn.classList.add('hidden');
    } else {
        history.forEach((item, index) => {
            const upiInfo = getUpiData(item.id);
            
            // Use a single container div with all necessary classes
            const historyItem = document.createElement('div');
            // Removed duration-200 from class list
            historyItem.classList.add(
                'history-item', 'flex', 'items-center', 'space-x-4', 'cursor-pointer', 
                'hover:bg-gray-800', 'relative', 
                'group', 'history-item-animated', 'p-4', 'rounded-xl', 'w-full'
            );
            historyItem.style.borderLeft = `5px solid ${upiInfo.color}`; 
            historyItem.style.backgroundColor = '#1f2125'; // Ensure specific dark background

            const itemIconUrl = upiInfo.icon || 'https://placehold.co/40x40/4B5563?text=Icon';
            const timePart = item.timestamp.split(', ')[1] || item.timestamp;

            historyItem.innerHTML = `
                <!-- Icon -->
                <img src="${itemIconUrl}" alt="${upiInfo.label} Icon" 
                    class="w-10 h-10 rounded-full border-2 border-gray-700 object-cover flex-shrink-0" 
                    onerror="this.onerror=null;this.src='https://placehold.co/40x40/4B5563?text=Icon'">
                
                <!-- Text Content (Label and Time/Amount) -->
                <div class="flex-1 min-w-0 ml-2">
                    <p class="text-gray-200 font-semibold truncate" style="font-family: 'Karla', sans-serif;">${upiInfo.label}</p>
                    <p class="text-gray-400 text-sm truncate" style="font-family: 'Karla', sans-serif;">₹${item.amount} - ${timePart}</p>
                </div>
                
                <!-- Action buttons with wrapper for pill-look -->
                <div class="history-item-actions flex items-center space-x-2 history-item-actions-wrapper">
                    <button class="regenerate-btn history-action-btn" title="Generate QR again">
                        <span class="material-symbols-outlined text-base">sync</span>
                    </button>
                    <button class="delete-btn history-action-btn" title="Delete entry" data-index="${index}">
                        <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                </div>
            `;
            
            // Attach listeners
            historyItem.addEventListener('click', (e) => {
                // Check if the click was directly on an action button or its child icon
                if (e.target.closest('.regenerate-btn') || e.target.closest('.delete-btn')) {
                    return;
                }
                currentQrAmount = item.amount;
                // NEW: Update highlighting and header display upon selecting from history
                updateButtonHighlighting(item.id);
                updateHeaderUpiDisplay(item.id);
                // NEW: Save the newly selected ID to localStorage
                localStorage.setItem(lastSelectedUpiKey, item.id);
                
                showQrModal(item.id, item.amount);
            });

            historyItem.querySelector('.regenerate-btn').addEventListener('click', () => {
                currentQrAmount = item.amount;
                saveHistory(item.id, item.amount);
                // NEW: Update highlighting and header display upon regenerating
                updateButtonHighlighting(item.id);
                updateHeaderUpiDisplay(item.id);
                // NEW: Save the newly selected ID to localStorage
                localStorage.setItem(lastSelectedUpiKey, item.id);
                
                showQrModal(item.id, item.amount);
            });

            historyItem.querySelector('.delete-btn').addEventListener('click', () => {
                let currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
                const indexToDelete = parseInt(historyItem.querySelector('.delete-btn').dataset.index, 10);
                currentHistory.splice(indexToDelete, 1);
                localStorage.setItem(historyKey, JSON.stringify(currentHistory));
                renderHistory();
            });

            historyList.appendChild(historyItem);
        });
        clearHistoryBtn.classList.remove('hidden');
    }
};

// --- End of Promoted functions for DOM manipulation ---


// UPDATED: Tone.js Audio Engine for thematic feedback (Kept here as a constant object)
const AudioEngine = {
    synth: null, // For numbers and musical tones
    operatorSynth: null, // For operators (now using a separate synth configuration)
    clearSynth: null, // For clear/AC button
    backspaceSynth: null, // For backspace
    magicalSynth: null, // NEW: For UPI button click
    isInitialized: false, // Flag to ensure synths are created only once

    initSynths: function() {
        if (!window.Tone || this.isInitialized) return;
        
        // 1. Synth for Notes (Numbers, Equals) - Volume set to -1dB for uniform loudness
        this.synth = new Tone.PolySynth(Tone.Synth, {
            volume: -1, // Set to -1dB for loud, stable, equal volume
            envelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0.1,
                release: 0.1
            },
            oscillator: {
                type: 'triangle' // Softer, flute-like tone
            },
        }).toDestination();

        // 2. Synth for Operators (Sharper, square wave tone for distinction)
        this.operatorSynth = new Tone.PolySynth(Tone.Synth, {
            volume: -1, // Set to -1dB for loud, stable, equal volume
            envelope: {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.05,
                release: 0.1
            },
            oscillator: {
                type: 'square' // Sharper, digital tone
            }
        }).toDestination();

        // 3. Elegant Clear Synth (DuoSynth for rich, resolved tone)
        this.clearSynth = new Tone.DuoSynth({
            volume: -1, // Set to -1dB for loud, stable, equal volume
            voice0: {
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 }
            },
            voice1: {
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 }
            },
            vibratoAmount: 0.5,
            vibratoRate: 5
        }).toDestination();

        // 4. Backspace Synth (AMSynth for a clean, quick-fading "Vanish" tone)
        this.backspaceSynth = new Tone.AMSynth({
            volume: -1, // Set to -1dB for loud, stable, equal volume
            envelope: {
                attack: 0.005,
                decay: 0.2, // Noticeable, fast decay for "vanishing" effect
                sustain: 0,
                release: 0.05
            },
            oscillator: {
                type: 'sine'
            },
            modulation: {
                type: 'square'
            },
            modulationIndex: 10,  
        }).toDestination();
        
        // 5. NEW: Magical Synth for UPI buttons (Shimmery, resonant sound)
        // Use a Synth passed through Chorus and Reverb for the magical/blowing effect
        this.magicalSynth = new Tone.Synth({
            volume: -1, // Set to -1dB for loud, stable, equal volume
            oscillator: {
                type: 'sine'
            },
            envelope: {
                attack: 0.01,
                decay: 1.5, // Long decay for 'blow' effect
                sustain: 0.1,
                release: 2
            }
        }).chain(new Tone.Chorus(5, 0.5, 0.9), new Tone.Reverb({ decay: 2, wet: 0.4 }), Tone.Destination);


        this.isInitialized = true;
    },
    
    // Function to start the audio context on user gesture
    startContext: async function() {
        if (window.Tone && Tone.context.state !== 'running') {
            try {
                // This resumes the AudioContext after a user gesture
                await Tone.start();
                console.log("Tone.js audio context started successfully.");
            } catch (e) {
                console.error("Failed to start Tone.js context:", e);
            }
        }
    },

    playTone: function(type, value) {  
        if (!this.isInitialized) return;  

        try {
            const now = Tone.now();
            switch (type) {
                case 'number':
                    // Map value to a specific note in the NoteMap
                    const note = NoteMap[value] || 'C4';  
                    this.synth.triggerAttackRelease(note, '16n');
                    break;
                case 'operator':
                    // Play two higher, distinct notes for a sharp chime effect
                    this.operatorSynth.triggerAttackRelease(['F5', 'A5'], '16n');
                    break;
                case 'equals':
                    // Satisfying ascending flourish (C4 -> E4 -> G4 -> C5)
                    this.synth.triggerAttackRelease('C4', '8n', now);
                    this.synth.triggerAttackRelease('E4', '8n', now + 0.075);
                    this.synth.triggerAttackRelease('G4', '8n', now + 0.15);
                    this.synth.triggerAttackRelease('C5', '4n', now + 0.225);
                    break;
                case 'clear':
                    // Elegant ascending arpeggio (C major chord)
                    this.clearSynth.triggerAttackRelease('C5', '4n');
                    this.clearSynth.triggerAttackRelease('E5', '4n', Tone.now() + 0.05);
                    this.clearSynth.triggerAttackRelease('G5', '4n', Tone.now() + 0.1);
                    break;
                case 'backspace':
                    // Plays a quick-fading AM tone to simulate vanishing
                    this.backspaceSynth.triggerAttackRelease('A5', '8n');  
                    break;
                case 'magical':
                    // NEW: Resonant, shimmery tone for UPI selection
                    this.magicalSynth.triggerAttackRelease('A4', '2n');
                    break;
            }
        } catch (e) {
            console.error('Tone.js playback error:', e);
        }
    }
};

// Confetti logic for successful QR generation (REMOVED: Now only used for clear history)
const triggerConfetti = (upiColor) => {
    if (!window.confetti) return;
    const colors = [upiColor, '#FFD700', '#FFAC33', '#ffffff'];
    const duration = 1.5 * 1000;

    // Confetti shot from the center of the screen
    confetti({
        particleCount: 100,
        startVelocity: 30,
        spread: 120,
        ticks: 60,
        origin: { y: 0.5, x: 0.5 },
        colors: colors,
        disableForReducedMotion: true
    });

    // Second, bigger burst from above
    confetti({
        particleCount: 80,
        angle: 90,
        spread: 70,
        origin: { x: 0.5, y: 0.1 },
        colors: colors,
        disableForReducedMotion: true
    });
    
    // Third shot from the sides
    confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: colors,
        disableForReducedMotion: true
    });

    confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: colors,
        disableForReducedMotion: true
    });
}
 
// NEW: Confetti logic for Clear History button
const triggerClearConfetti = (element) => {
    if (!window.confetti) return;
    const rect = element.getBoundingClientRect();
    // Calculate normalized coordinates (0 to 1) for the button center
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    const colors = ['#f87171', '#ef4444', '#b91c1c', '#f97316']; // Red/Orange delete palette

    confetti({
        particleCount: 50,
        startVelocity: 25,
        spread: 45,
        ticks: 60,
        origin: { x: x, y: y },
        colors: colors,
        disableForReducedMotion: true
    });
}


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
    
    // Edit Modal Element References
    const editSaveBtn = document.getElementById('edit-save-btn');
    const editCancelBtn = document.getElementById('edit-cancel-btn');
    const editUpiIdInput = document.getElementById('edit-upi-id');
    const editUpiLabelInput = document.getElementById('edit-upi-label');


    // Refactored view switching logic for a smoother animation
    const showMainView = () => {
        historyView.classList.remove('history-visible');
        historyIcon.innerText = 'history';
        historyView.classList.add('hidden');
        mainView.classList.remove('hidden');
        
        // NEW: Stop gradient scroll animation when leaving history view
        if (historyFooter) {
            historyFooter.classList.remove('footer-is-visible');
        }
    };

    const showHistoryView = () => {
        historyView.classList.remove('hidden');
        mainView.classList.add('hidden');
        historyView.classList.add('history-visible');
        historyIcon.innerText = 'arrow_back';
        renderHistory();

        // NEW: Start gradient scroll animation when entering history view
        if (historyFooter) {
            // Timeout ensures the animation starts after the element is painted/slid up
            setTimeout(() => {
                historyFooter.classList.add('footer-is-visible');
            }, 500);  
        }
    };

    historyBtn.addEventListener('click', () => {
        if (historyView.classList.contains('hidden')) {
            showHistoryView();
        } else {
            showMainView();
        }
    });
    
    // --- Header Shrink Scroll Listener (New Feature Logic) ---
    const scrollThreshold = 20; // Pixels scrolled before header shrinks
    
    const handleScroll = () => {
        // Only apply shrink effect when main view is active and content overflows (scrollable)
        if (!mainView.classList.contains('hidden') && document.body.scrollHeight > window.innerHeight) {
            if (document.documentElement.scrollTop > scrollThreshold) {
                floatingHeader.classList.add('header-shrunk');
            } else {
                floatingHeader.classList.remove('header-shrunk');
            }
        }
    };
    
    // Attach scroll listener to the window
    window.addEventListener('scroll', handleScroll);
    // Also run once on load to correct initial state if user refreshes mid-scroll
    handleScroll();
    
    // --- End Header Shrink Scroll Listener ---


    // Existing Logic
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
        }, 300); 
    });

    // --- Edit Modal Close Listener ---
    const hideEditModal = () => {
        editModalOverlay.classList.remove('visible');
        setTimeout(() => {
            editModalOverlay.classList.add('hidden');
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
