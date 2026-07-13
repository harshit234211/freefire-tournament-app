let API_URL = "https://slippery-chipmunk-84.loca.lt/api";

// Auto-detect environment: Use localhost directly if opened on the laptop browser
if (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    API_URL = "http://localhost:5000/api";
    console.log("Laptop local environment detected. Connecting to localhost directly.");
}

// APP STATE
let gameState = {
    currentUser: null,
    token: null,
    tournaments: [],
    announcements: [],
    activeTab: 'home',
    activeFilter: 'upcoming',
    countdownInterval: null
};

// ==========================================
// SESSION MANAGEMENT (JWT AUTH)
// ==========================================

// Helper to set headers for authenticated API requests
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true'
    };
    if (gameState.token) {
        headers['x-auth-token'] = gameState.token;
    }
    return headers;
}

// Toggle between Login & Register forms
function toggleAuthForm(type) {
    const loginForm = document.getElementById("auth-login-form");
    const registerForm = document.getElementById("auth-register-form");
    const title = document.getElementById("auth-title");
    
    if (type === "register") {
        title.innerText = "REGISTER WARRIOR";
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
    } else {
        title.innerText = "LOGIN TO ARENA";
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
    }
}

// Check if user is logged in
async function checkUserSession() {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) {
        showAuthOverlay();
        return;
    }

    gameState.token = savedToken;

    try {
        const res = await fetch(`${API_URL}/auth/user`, {
            headers: getAuthHeaders()
        });

        const data = await res.json();

        if (res.ok) {
            gameState.currentUser = data;
            hideAuthOverlay();
            initializeDashboard();
        } else {
            logoutSession();
        }
    } catch (err) {
        console.error("Session verification failed:", err);
        // If server is offline, keep overlay visible
    }
}

// Execute Login
async function executeLogin() {
    const phone = document.getElementById("auth-login-phone").value.trim();
    const password = document.getElementById("auth-login-pass").value;

    if (!phone || !password) {
        alert("Please fill all login fields.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true'
            },
            body: JSON.stringify({ phone, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.msg || "Login failed");
        }

        gameState.token = data.token;
        gameState.currentUser = data.user;
        localStorage.setItem("token", data.token);

        hideAuthOverlay();
        initializeDashboard();
        alert(`Welcome back, ${data.user.username}!`);
    } catch (err) {
        alert(err.message);
    }
}

// Execute Register
async function executeRegister() {
    const username = document.getElementById("auth-reg-name").value.trim();
    const phone = document.getElementById("auth-reg-phone").value.trim();
    const password = document.getElementById("auth-reg-pass").value;

    if (!username || !phone || !password) {
        alert("Please fill all registration fields.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true'
            },
            body: JSON.stringify({ username, phone, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.msg || "Registration failed");
        }

        gameState.token = data.token;
        gameState.currentUser = data.user;
        localStorage.setItem("token", data.token);

        hideAuthOverlay();
        initializeDashboard();
        alert(`Registration successful! Welcome to Arena, ${data.user.username}.`);
    } catch (err) {
        alert(err.message);
    }
}

// Update profile details (IGN & Character UID)
async function updateProfileSettings() {
    const username = document.getElementById("profile-username").value.trim();
    const ffName = document.getElementById("profile-ffname").value.trim();
    const ffUid = document.getElementById("profile-ffuid").value.trim();

    try {
        const res = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ username, ffName, ffUid })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.msg || "Could not update profile settings");
        }

        gameState.currentUser = data;
        renderProfileView();
        alert("Profile details updated successfully!");
    } catch (err) {
        alert(err.message);
    }
}

// Logout session
function logoutSession() {
    gameState.token = null;
    gameState.currentUser = null;
    localStorage.removeItem("token");
    showAuthOverlay();
}

function showAuthOverlay() {
    document.getElementById("auth-container").classList.add("active");
}

function hideAuthOverlay() {
    document.getElementById("auth-container").classList.remove("active");
}

// ==========================================
// DASHBOARD INITIALIZATION
// ==========================================
function initializeDashboard() {
    // 1. Update wallet balance display
    updateWalletDisplay();

    // 2. Load role panel quick-toggle buttons based on user permissions
    const user = gameState.currentUser;
    const hostBtn = document.getElementById("host-console-btn");
    const adminBtn = document.getElementById("admin-console-btn");

    if (user.role === "admin") {
        hostBtn.classList.remove("hidden");
        adminBtn.classList.remove("hidden");
    } else if (user.role === "host") {
        hostBtn.classList.remove("hidden");
        adminBtn.classList.add("hidden");
    } else {
        hostBtn.classList.add("hidden");
        adminBtn.classList.add("hidden");
    }

    // 3. Load active tab details
    switchTab('home');
    fetchAnnouncements();
}

// ==========================================
// NAVIGATION TAB CONTROLLER
// ==========================================
function switchTab(tabId) {
    gameState.activeTab = tabId;

    // Remove active state from navigation bar items
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    const navItem = document.getElementById(`nav-${tabId}`);
    if (navItem) navItem.classList.add("active");

    // Hide all view panels and display the targeted panel
    document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));
    document.getElementById(`view-${tabId}`).classList.add("active");

    // Clear active intervals
    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }

    // Load dynamic data specific to views
    if (tabId === 'home') {
        fetchTournaments();
    } else if (tabId === 'wallet') {
        renderWalletView();
        fetchTransactions();
    } else if (tabId === 'leaderboard') {
        fetchLeaderboard();
    } else if (tabId === 'profile') {
        renderProfileView();
    } else if (tabId === 'host') {
        fetchHostMatches();
    } else if (tabId === 'admin') {
        switchAdminAction('match', document.querySelector(".admin-sub-tab"));
    }
}

// Update app coin badges
function updateWalletDisplay() {
    const user = gameState.currentUser;
    if (!user) return;
    
    const balanceText = `₹${(user.coins + user.winnings).toFixed(2)}`;
    document.getElementById("header-balance").innerText = balanceText;
}

// Fetch system announcements and warnings
async function fetchAnnouncements() {
    try {
        const res = await fetch(`${API_URL}/tournaments/announcements`);
        const data = await res.json();
        
        if (res.ok && data.length > 0) {
            gameState.announcements = data;
            const textElement = document.getElementById("announcement-text");
            const banner = document.getElementById("announcement-banner");
            
            // Format announcements into one long sliding string
            const scrollText = data.map(a => `[${a.title.toUpperCase()}] ${a.content}`).join("  |  ");
            textElement.innerText = scrollText;
            banner.classList.remove("hidden");
        }
    } catch (err) {
        console.error("Announcements failed to fetch:", err);
    }
}

// ==========================================
// TOURNAMENTS ENGINE (ARENA & DETAILED LOCKS)
// ==========================================

// Filter tournaments list
function filterMatches(filter, element) {
    gameState.activeFilter = filter;
    document.querySelectorAll(".arena-tab").forEach(el => el.classList.remove("active"));
    element.classList.add("active");
    renderTournamentsGrid();
}

// Retrieve all matches from DB
async function fetchTournaments() {
    const grid = document.getElementById("tournaments-grid");
    grid.innerHTML = `<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching Battlegrounds...</div>`;

    try {
        const res = await fetch(`${API_URL}/tournaments`);
        const data = await res.json();

        if (res.ok) {
            gameState.tournaments = data;
            renderTournamentsGrid();
        } else {
            grid.innerHTML = `<div class="text-center text-muted">Error loading tournaments</div>`;
        }
    } catch (err) {
        grid.innerHTML = `<div class="text-center text-muted">Server offline. Check local database status.</div>`;
    }
}

// Get customized gaming banners based on the map selected
function getMatchBanner(mapName) {
    if (mapName === 'Bermuda') {
        return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'; // eSports Arena
    } else if (mapName === 'Kalahari') {
        return 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=600&q=80'; // Neon cyberpunk
    } else if (mapName === 'Purgatory') {
        return 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80'; // Gaming console
    } else {
        return 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=600&q=80'; // Gaming monitor
    }
}

// Render list of tournaments
function renderTournamentsGrid() {
    const grid = document.getElementById("tournaments-grid");
    grid.innerHTML = "";

    const filtered = gameState.tournaments.filter(t => t.status === gameState.activeFilter);

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="text-center text-muted" style="padding: 40px 0;">No ${gameState.activeFilter} matches scheduled.</div>`;
        return;
    }

    filtered.forEach(t => {
        const isRegistered = t.joinedPlayers.some(p => p.user === gameState.currentUser?.id);
        const slotsFilled = t.joinedPlayers.length;
        const progressPercent = Math.min(100, (slotsFilled / t.totalSlots) * 100);
        
        let buttonHtml = "";
        if (t.status === 'upcoming') {
            if (isRegistered) {
                buttonHtml = `<button class="card-btn registered-btn" onclick="openMatchDetails('${t._id}')"><i class="fa-solid fa-circle-check"></i> Registered</button>`;
            } else if (slotsFilled >= t.totalSlots) {
                buttonHtml = `<button class="card-btn join-btn" disabled>Match Full</button>`;
            } else {
                buttonHtml = `<button class="card-btn join-btn" onclick="joinTournament('${t._id}')"><i class="fa-solid fa-gamepad"></i> Join ₹${t.entryFee}</button>`;
            }
        } else if (t.status === 'ongoing') {
            buttonHtml = `<button class="card-btn join-btn" onclick="openMatchDetails('${t._id}')"><i class="fa-solid fa-circle-play"></i> Unlock Lobby</button>`;
        } else {
            buttonHtml = `<button class="card-btn details-btn" onclick="openMatchDetails('${t._id}')"><i class="fa-solid fa-award"></i> View Results</button>`;
        }

        const card = document.createElement("div");
        card.className = "tournament-card";
        card.innerHTML = `
            <div class="card-banner-wrapper">
                <img src="${getMatchBanner(t.map)}" class="card-banner-img" alt="Match Banner">
                <div class="banner-overlay"></div>
            </div>
            <div class="card-top">
                <div class="card-title-block">
                    <h4>${t.title}</h4>
                    <div class="card-tags">
                        <span class="tag-pill tag-mode">${t.mode}</span>
                        <span class="tag-pill tag-map">${t.map}</span>
                        <span class="tag-pill" style="background: rgba(0, 240, 255, 0.15); border: 1px solid var(--cyan); color: var(--cyan);">${t.skills ? 'Skills: ON' : 'Skills: OFF'}</span>
                        <span class="tag-pill" style="background: rgba(255, 179, 0, 0.15); border: 1px solid var(--gold); color: var(--gold);">${t.attributes ? 'Attr: ON' : 'Attr: OFF'}</span>
                        ${t.weapons === 'Sniper Only' ? '<span class="tag-pill" style="background: rgba(255, 0, 0, 0.2); border: 1px solid red; color: red;">Sniper Only</span>' : ''}
                        ${t.unlimitedAmmo ? '<span class="tag-pill" style="background: rgba(0, 255, 0, 0.15); border: 1px solid #00ff00; color: #00ff00;">Unlimited Ammo</span>' : ''}
                    </div>
                </div>
                <div class="card-time">
                    <span class="time-clock">${t.time}</span>
                    <span class="time-date">${t.date}</span>
                </div>
            </div>
            <div class="card-payouts">
                <div class="payout-item pool">
                    <label>Prize Pool</label>
                    <span>₹${t.prizePool}</span>
                </div>
                <div class="payout-item kill">
                    <label>Per Kill</label>
                    <span>₹${t.perKill}</span>
                </div>
                <div class="payout-item fee">
                    <label>Entry Fee</label>
                    <span>₹${t.entryFee}</span>
                </div>
            </div>
            <div class="card-bottom">
                <div class="slots-progress-info">
                    <span class="slots-left-text">${t.totalSlots - slotsFilled} Slots remaining</span>
                    <span class="slots-ratio-text">${slotsFilled}/${t.totalSlots} Joined</span>
                </div>
                <div class="progressbar-track">
                    <div class="progressbar-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="card-button-row">
                    <button class="card-btn details-btn" onclick="openMatchDetails('${t._id}')">Lobby Stats</button>
                    ${buttonHtml}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Join tournament
async function joinTournament(matchId) {
    if (!gameState.currentUser.ffUid || !gameState.currentUser.ffName) {
        alert("Warning: You must configure your Free Fire character IGN and UID in the Profile settings before joining any lobby!");
        switchTab('profile');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/tournaments/${matchId}/join`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.msg || "Could not register for tournament");
        }

        // Update local session
        gameState.currentUser = data.user;
        updateWalletDisplay();
        fetchTournaments();

        alert("Success! You have registered for this tournament. Prepare your gear!");
    } catch (err) {
        alert(err.message);
    }
}

// Open Match Details & Room Code release countdown
async function openMatchDetails(matchId) {
    const t = gameState.tournaments.find(x => x._id === matchId);
    if (!t) return;

    if (gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
    }

    document.getElementById("modal-match-title").innerText = t.title;
    document.getElementById("modal-prize-pool").innerText = `₹${t.prizePool}`;
    document.getElementById("modal-per-kill").innerText = `₹${t.perKill}`;
    document.getElementById("modal-entry-fee").innerText = `₹${t.entryFee}`;
    document.getElementById("modal-map").innerText = t.map;
    document.getElementById("modal-mode").innerText = t.mode;
    document.getElementById("modal-schedule").innerText = `${t.date} @ ${t.time}`;
    
    // Set custom spec details
    document.getElementById("modal-skills").innerText = t.skills ? 'ON' : 'OFF';
    document.getElementById("modal-attributes").innerText = t.attributes ? 'ON' : 'OFF';
    document.getElementById("modal-bodyshot").innerText = t.bodyShot ? 'Allowed' : 'Headshot Only';
    document.getElementById("modal-weapons").innerText = t.weapons || 'All';
    document.getElementById("modal-ammo").innerText = t.unlimitedAmmo ? 'Unlimited' : 'Normal';
    document.getElementById("modal-roomtype").innerText = t.roomType || 'Normal';

    // Slots progress
    const slotsFilled = t.joinedPlayers.length;
    document.getElementById("modal-joined-ratio").innerText = `${slotsFilled}/${t.totalSlots}`;
    document.getElementById("modal-progress-bar").style.width = `${(slotsFilled / t.totalSlots) * 100}%`;

    // Render registered players
    const listContainer = document.getElementById("modal-joined-players-list");
    listContainer.innerHTML = "";
    if (t.joinedPlayers.length === 0) {
        listContainer.innerHTML = `<span class="text-muted" style="grid-column: span 2; text-align: center; font-size: 11px;">No players registered yet.</span>`;
    } else {
        t.joinedPlayers.forEach(p => {
            const badge = document.createElement("span");
            badge.className = "reg-player-badge";
            badge.innerText = `🎮 ${p.name}`;
            listContainer.appendChild(badge);
        });
    }

    // Dynamic Join/Registered Actions button
    const isRegistered = t.joinedPlayers.some(p => p.user === gameState.currentUser?.id);
    const footer = document.getElementById("modal-action-footer");
    footer.innerHTML = "";

    if (t.status === 'upcoming') {
        if (isRegistered) {
            footer.innerHTML = `<button class="btn btn-neon-green btn-block" disabled><i class="fa-solid fa-circle-check"></i> Registered for Battle</button>`;
        } else if (slotsFilled >= t.totalSlots) {
            footer.innerHTML = `<button class="btn btn-neon-orange btn-block" disabled>Lobby Full</button>`;
        } else {
            footer.innerHTML = `<button class="btn btn-neon-orange btn-block" onclick="joinTournament('${t._id}'); closeModal('match-details-modal');"><i class="fa-solid fa-gamepad"></i> Register Entry ₹${t.entryFee}</button>`;
        }
    } else if (t.status === 'completed') {
        // Display results table instead of credentials
        footer.innerHTML = `<button class="btn btn-neon-green btn-block" disabled><i class="fa-solid fa-circle-check"></i> Match Completed & Disbursed</button>`;
    } else {
        footer.innerHTML = `<button class="btn btn-neon-green btn-block" disabled><i class="fa-solid fa-crosshairs"></i> Match Ongoing / Live</button>`;
    }

    // Countdown and Credentials Unlock Setup
    const lockPanel = document.getElementById("modal-room-lock-panel");
    const heading = document.getElementById("modal-room-heading");
    const icon = document.getElementById("modal-room-icon");
    const desc = document.getElementById("modal-room-desc");
    const countdownVal = document.getElementById("modal-countdown-timer");
    const credGroup = document.getElementById("modal-credentials-group");

    // Fetch room codes if registered
    if (isRegistered || gameState.currentUser.role === 'admin' || (gameState.currentUser.role === 'host' && t.assignedHost === gameState.currentUser.id)) {
        lockPanel.classList.remove("hidden");

        const updateRoomUI = async () => {
            try {
                const res = await fetch(`${API_URL}/tournaments/${t._id}/room`, {
                    headers: getAuthHeaders()
                });
                const credentials = await res.json();

                if (credentials.locked) {
                    lockPanel.className = "room-credentials-box locked";
                    heading.innerText = "Lobby Credentials Locked";
                    icon.className = "fa-solid fa-lock lock-icon";
                    desc.innerText = credentials.msg;
                    credGroup.classList.add("hidden");

                    // Countdown logic
                    const matchTime = new Date(`${t.date}T${t.time}`);
                    const countdownTick = () => {
                        const now = new Date();
                        const diff = matchTime - now;
                        
                        if (diff <= 0) {
                            countdownVal.innerText = "00:00:00";
                            clearInterval(gameState.countdownInterval);
                            updateRoomUI();
                            return;
                        }

                        const hrs = Math.floor(diff / 3600000).toString().padStart(2, '0');
                        const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
                        const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                        
                        countdownVal.innerText = `${hrs}:${mins}:${secs}`;
                    };
                    countdownTick();
                    gameState.countdownInterval = setInterval(countdownTick, 1000);

                } else {
                    // Unlocked
                    lockPanel.className = "room-credentials-box unlocked";
                    heading.innerText = "Room Credentials Unlocked!";
                    icon.className = "fa-solid fa-lock-open lock-icon";
                    desc.innerText = "Enter these details in custom room in Free Fire.";
                    countdownVal.innerText = "LOBBY READY";
                    credGroup.classList.remove("hidden");
                    document.getElementById("modal-room-id").innerText = credentials.roomId;
                    document.getElementById("modal-room-password").innerText = credentials.roomPassword;
                }
            } catch (err) {
                console.error("Error fetching room details:", err);
            }
        };

        updateRoomUI();

    } else {
        // Not registered, hide room codes unlock card completely
        lockPanel.classList.add("hidden");
    }

    openModal("match-details-modal");
}

// Helper to copy credential fields
function copyText(elementId) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
}

// ==========================================
// WALLET ACTIONS & CASHFREE GATEWAY
// ==========================================

function renderWalletView() {
    const user = gameState.currentUser;
    if (!user) return;

    document.getElementById("wallet-balance-total").innerText = `₹${(user.coins + user.winnings).toFixed(2)}`;
    document.getElementById("wallet-balance-deposit").innerText = `₹${user.coins.toFixed(2)}`;
    document.getElementById("wallet-balance-winning").innerText = `₹${user.winnings.toFixed(2)}`;
}

// Switch between Add (Deposit) & Withdraw money panels
function switchWalletAction(action, element) {
    document.querySelectorAll(".control-tab").forEach(el => el.classList.remove("active"));
    element.classList.add("active");

    if (action === 'add') {
        document.getElementById("action-add-money").classList.add("active");
        document.getElementById("action-withdraw-money").classList.remove("active");
    } else {
        document.getElementById("action-add-money").classList.remove("active");
        document.getElementById("action-withdraw-money").classList.add("active");
    }
}

function setDepositAmount(amt) {
    document.getElementById("input-deposit-amount").value = amt;
}

function adjustWithdrawLabel() {
    const method = document.getElementById("select-withdraw-method").value;
    const label = document.getElementById("withdraw-label-dynamic");
    const input = document.getElementById("input-withdraw-details");
    
    if (method === "upi") {
        label.innerText = "UPI Address";
        input.placeholder = "e.g. name@upi";
    } else {
        label.innerText = "Paytm Mobile Number";
        input.placeholder = "e.g. 9876543210";
    }
}

// Cashfree Deposit API trigger
async function initializeCashfreeDeposit() {
    const amount = document.getElementById("input-deposit-amount").value;
    const depAmt = parseFloat(amount);

    if (isNaN(depAmt) || depAmt < 10) {
        alert("Minimum deposit amount is ₹10.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/wallet/deposit/order`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ amount: depAmt })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.msg || "Cashfree deposit failed to initialize");
        }

        // Check if simulated
        if (data.simulated) {
            // Open simulated modal
            document.getElementById("cf-modal-amount").innerText = `₹${data.amount.toFixed(2)}`;
            
            // Generate dynamic UPI Deep Link QR Code (Pre-fills payee, name, and exact amount)
            const upiLink = `upi://pay?pa=7017022966@ibl&pn=Khiladi%20Battle&am=${data.amount}&cu=INR`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`;
            
            const qrImg = document.getElementById("cf-qr-image");
            if (qrImg) {
                qrImg.src = qrImageUrl;
            }
            
            // Temporarily store order ID in modal attribute to complete transaction simulation
            document.getElementById("cashfree-simulator-modal").setAttribute("data-order-id", data.orderId);
            openModal("cashfree-simulator-modal");
        } else {
            // Real Cashfree API: Render real Cashfree JS SDK checkout overlay
            const cashfree = Cashfree({
                mode: "sandbox" // Change to "production" when live keys are in place
            });
            
            const currentUrl = window.location.href.split('?')[0];
            
            cashfree.checkout({
                paymentSessionId: data.paymentSessionId,
                returnUrl: `${currentUrl}?order_id=${data.orderId}`
            }).then((result) => {
                if (result.error) {
                    alert(result.error.message);
                }
            });
        }
    } catch (err) {
        alert(err.message);
    }
}

// Complete simulated Cashfree verification call
async function executeCashfreeSimulation(successStatus) {
    const modal = document.getElementById("cashfree-simulator-modal");
    const orderId = modal.getAttribute("data-order-id");

    try {
        const res = await fetch(`${API_URL}/wallet/deposit/verify`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                orderId,
                isSimulatedSuccess: successStatus
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            gameState.currentUser = data.user;
            updateWalletDisplay();
            renderWalletView();
            fetchTransactions();
            alert("Payment Verified! Balance successfully credited to your wallet.");
        } else {
            alert("Payment failed or cancelled.");
        }

        closeModal("cashfree-simulator-modal");
    } catch (err) {
        alert("Payment verification connection error.");
    }
}

// Submit a withdrawal request
async function submitWithdrawalRequest() {
    const amount = document.getElementById("input-withdraw-amount").value;
    const method = document.getElementById("select-withdraw-method").value;
    const details = document.getElementById("input-withdraw-details").value.trim();

    const withdrawAmt = parseFloat(amount);
    if (isNaN(withdrawAmt) || withdrawAmt < 50) {
        alert("Minimum withdrawal is ₹50.");
        return;
    }

    if (!details) {
        alert("Please enter payment transfer details.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/wallet/withdraw`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ amount: withdrawAmt, method, details })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.msg || "Withdrawal failed");
        }

        gameState.currentUser = data.user;
        updateWalletDisplay();
        renderWalletView();
        fetchTransactions();

        alert("Withdrawal request submitted! Deducted winnings will show as pending until admin approval.");
    } catch (err) {
        alert(err.message);
    }
}

// Retrieve transaction history
async function fetchTransactions() {
    const container = document.getElementById("transactions-scroller");
    container.innerHTML = `<div class="text-center text-muted" style="font-size: 11px;">Loading transactions...</div>`;

    try {
        const res = await fetch(`${API_URL}/wallet/transactions`, {
            headers: getAuthHeaders()
        });

        const data = await res.json();

        if (res.ok) {
            container.innerHTML = "";
            if (data.length === 0) {
                container.innerHTML = `<div class="text-center text-muted" style="padding:20px 0; font-size:11px;">No transactions recorded.</div>`;
                return;
            }

            data.forEach(t => {
                const date = new Date(t.date).toLocaleString();
                const sign = (t.type === 'deposit' || t.type === 'winning') ? '+' : '-';
                const classSign = (t.type === 'deposit' || t.type === 'winning') ? 'add' : 'sub';

                const card = document.createElement("div");
                card.className = "statement-card";
                card.innerHTML = `
                    <div class="statement-left">
                        <span class="statement-type">${t.detail || t.type.toUpperCase()}</span>
                        <span class="statement-date">${date}</span>
                    </div>
                    <div class="statement-right">
                        <span class="statement-amount ${classSign}">${sign}₹${t.amount}</span>
                        <span class="statement-status ${t.status}">${t.status}</span>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (err) {
        console.error("Could not load transactions:", err);
    }
}

// ==========================================
// VIEW 3: LEADERBOARD STANDINGS
// ==========================================
async function fetchLeaderboard() {
    const rowsContainer = document.getElementById("leaderboard-rows");
    rowsContainer.innerHTML = `<tr><td colspan="4" class="text-center">Calculating ranks...</td></tr>`;

    try {
        const res = await fetch(`${API_URL}/tournaments/leaderboard`);
        const data = await res.json();

        if (res.ok) {
            rowsContainer.innerHTML = "";
            
            // Set top 3 podium names
            document.getElementById("podium-name-1").innerText = data[0]?.name || "Empty";
            document.getElementById("podium-win-1").innerText = `₹${data[0]?.winnings || 0}`;

            document.getElementById("podium-name-2").innerText = data[1]?.name || "Empty";
            document.getElementById("podium-win-2").innerText = `₹${data[1]?.winnings || 0}`;

            document.getElementById("podium-name-3").innerText = data[2]?.name || "Empty";
            document.getElementById("podium-win-3").innerText = `₹${data[2]?.winnings || 0}`;

            if (data.length === 0) {
                rowsContainer.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No entries on board.</td></tr>`;
                return;
            }

            data.forEach(r => {
                const tr = document.createElement("tr");
                const isTop3Class = r.rank <= 3 ? "top-3" : "";
                
                tr.innerHTML = `
                    <td class="rank-cell"><span class="${isTop3Class}">${r.rank}</span></td>
                    <td class="warrior-cell">🎮 ${r.name}</td>
                    <td>💀 ${r.kills}</td>
                    <td class="win-cell">₹${r.winnings}</td>
                `;
                rowsContainer.appendChild(tr);
            });
        }
    } catch (err) {
        console.error("Leaderboard failed:", err);
    }
}

// ==========================================
// VIEW 4: PROFILE SETUPS
// ==========================================
function renderProfileView() {
    const user = gameState.currentUser;
    if (!user) return;

    document.getElementById("profile-title-name").innerText = user.username.toUpperCase();
    document.getElementById("profile-title-phone").innerText = `📱 +91 ${user.phone}`;

    // Stats
    document.getElementById("profile-stats-matches").innerText = user.stats.matches;
    document.getElementById("profile-stats-kills").innerText = user.stats.kills;
    document.getElementById("profile-stats-winnings").innerText = `₹${user.winnings}`;

    // Inputs
    document.getElementById("profile-username").value = user.username;
    document.getElementById("profile-ffname").value = user.ffName || "";
    document.getElementById("profile-ffuid").value = user.ffUid || "";
}

// ==========================================
// VIEW 6: HOST MANAGER PANEL
// ==========================================
async function fetchHostMatches() {
    const container = document.getElementById("host-matches-container");
    container.innerHTML = `<div class="text-center text-muted">Loading assigned matches...</div>`;

    try {
        const res = await fetch(`${API_URL}/host/assigned-matches`, {
            headers: getAuthHeaders()
        });

        const data = await res.json();

        if (res.ok) {
            container.innerHTML = "";
            if (data.length === 0) {
                container.innerHTML = `<div class="text-center text-muted" style="padding:30px 0;">No tournaments currently assigned to your Host profile.</div>`;
                return;
            }

            data.forEach(t => {
                const card = document.createElement("div");
                card.className = "adm-item-card";
                
                let actionsHtml = "";
                if (t.status === 'upcoming') {
                    actionsHtml = `
                        <div class="adm-item-btn-row">
                            <button class="adm-mini-btn btn-host-change" onclick="updateRoomCredentials('${t._id}')"><i class="fa-solid fa-key"></i> Update Room Details</button>
                        </div>
                    `;
                } else if (t.status === 'ongoing') {
                    actionsHtml = `
                        <div class="adm-item-btn-row">
                            <button class="adm-mini-btn btn-host-change" onclick="updateRoomCredentials('${t._id}')"><i class="fa-solid fa-key"></i> Update Room Details</button>
                            <button class="adm-mini-btn btn-approve" onclick="openHostResolver('${t._id}')"><i class="fa-solid fa-trophy"></i> Submit Results</button>
                        </div>
                    `;
                } else {
                    actionsHtml = `<div class="text-green" style="font-size:10px; font-weight:700; margin-top:8px;"><i class="fa-solid fa-circle-check"></i> Match Completed & Disbursed</div>`;
                }

                card.innerHTML = `
                    <h4>${t.title}</h4>
                    <div style="font-size:11px; color:var(--text-sub); display:flex; flex-direction:column; gap:2px;">
                        <span>📅 Date/Time: ${t.date} @ ${t.time}</span>
                        <span>🔫 Mode: ${t.mode} (${t.map})</span>
                        <span>🎟️ Entry Fee: ₹${t.entryFee} | Prize: ₹${t.prizePool}</span>
                        <span>🔑 Room ID: ${t.roomId || 'Not set'} | Pass: ${t.roomPassword || 'Not set'}</span>
                    </div>
                    ${actionsHtml}
                `;
                container.appendChild(card);
            });
        }
    } catch (err) {
        container.innerHTML = `<div class="text-center text-muted">Error loading assigned host matches.</div>`;
    }
}

// Host update Room ID/Pass
async function updateRoomCredentials(matchId) {
    const roomId = prompt("Enter Custom Lobby Room ID:");
    if (roomId === null) return;
    const roomPassword = prompt("Enter Custom Lobby Password:");
    if (roomPassword === null) return;

    try {
        const res = await fetch(`${API_URL}/host/${matchId}/room`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ roomId, roomPassword })
        });

        if (res.ok) {
            alert("Room Credentials updated! Ongoing status is now live for players.");
            fetchHostMatches();
        } else {
            const errData = await res.json();
            alert(errData.msg || "Could not save credentials");
        }
    } catch (err) {
        alert("Connection failed.");
    }
}

// Open host scoring resolver modal
function openHostResolver(matchId) {
    const t = gameState.tournaments.find(x => x._id === matchId) || gameState.tournaments[0]; // fallback
    if (!t) return;

    const body = document.getElementById("host-resolve-body");
    body.innerHTML = `
        <h4 style="margin-bottom:12px; font-size:13px;">Match: ${t.title}</h4>
        <div class="results-input-row" style="font-weight:700; border-bottom:1.5px solid var(--border-white); padding-bottom:8px; margin-bottom:8px;">
            <span>Warrior IGN</span>
            <span class="text-center">Kills</span>
            <span class="text-center">Rank (1st, 2nd)</span>
        </div>
    `;

    t.joinedPlayers.forEach((p, idx) => {
        const row = document.createElement("div");
        row.className = "results-input-row";
        row.innerHTML = `
            <span>🎮 ${p.name}</span>
            <input type="number" class="player-kill-input" data-uid="${p.uid}" value="0" min="0">
            <input type="number" class="player-rank-input" data-uid="${p.uid}" value="${idx + 1}" min="1">
        `;
        body.appendChild(row);
    });

    const footer = document.getElementById("host-resolve-footer");
    footer.innerHTML = `<button class="btn btn-neon-green btn-block" onclick="submitHostResolution('${t._id}')"><i class="fa-solid fa-trophy"></i> Resolve Standings & Payouts</button>`;
    
    openModal("host-resolve-modal");
}

// Submit score resolution to backend
async function submitHostResolution(matchId) {
    const body = document.getElementById("host-resolve-body");
    const killInputs = body.querySelectorAll(".player-kill-input");
    const rankInputs = body.querySelectorAll(".player-rank-input");

    const playerResults = [];
    killInputs.forEach(ki => {
        const uid = ki.getAttribute("data-uid");
        const kills = parseInt(ki.value) || 0;
        
        // Find matching rank input
        const ri = Array.from(rankInputs).find(r => r.getAttribute("data-uid") === uid);
        const rank = parseInt(ri.value) || 99;

        playerResults.push({ uid, kills, rank });
    });

    try {
        const res = await fetch(`${API_URL}/host/${matchId}/resolve`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ playerResults })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.msg || "Scoring resolution failed");
        }

        alert("Standings resolved! Prize cash distributed to winning wallets instantly.");
        closeModal("host-resolve-modal");
        fetchHostMatches();
        fetchTournaments();
    } catch (err) {
        alert(err.message);
    }
}

// ==========================================
// VIEW 7: SUPER ADMIN CONSOLE
// ==========================================

// Switch sub-menus in Super Admin Console
function switchAdminAction(action, element) {
    document.querySelectorAll(".admin-sub-tab").forEach(el => el.classList.remove("active"));
    element.classList.add("active");

    document.querySelectorAll(".admin-sub-content").forEach(el => el.classList.remove("active"));
    document.getElementById(`admin-sub-${action}`).classList.add("active");

    if (action === 'match') {
        fetchAdminHostsList();
    } else if (action === 'users') {
        fetchAdminUsers();
    } else if (action === 'earnings') {
        fetchAdminEarnings();
    } else if (action === 'deposits') {
        fetchAdminDeposits();
    } else if (action === 'withdrawals') {
        fetchAdminWithdrawals();
    }
}

// Retrieve host users list to populate dropdown
async function fetchAdminHostsList() {
    const select = document.getElementById("adm-assign-host");
    select.innerHTML = `<option value="">No Host (Admin Manage)</option>`;

    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: getAuthHeaders()
        });
        const users = await res.json();

        if (res.ok) {
            const hosts = users.filter(u => u.role === 'host' || u.role === 'admin');
            hosts.forEach(h => {
                const opt = document.createElement("option");
                opt.value = h.id || h._id;
                opt.innerText = `Host: ${h.username} (${h.phone})`;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Could not fetch hosts list:", err);
    }
}

// Auto-fill template values for quick hosting
function applyTournamentTemplate(templateName) {
    if (!templateName) return;

    const titleInput = document.getElementById("adm-title");
    const mapSelect = document.getElementById("adm-map");
    const modeSelect = document.getElementById("adm-mode");
    const slotsInput = document.getElementById("adm-slots");
    const skillsSelect = document.getElementById("adm-skills");
    const attributesSelect = document.getElementById("adm-attributes");
    const bodyshotSelect = document.getElementById("adm-bodyshot");
    const weaponsSelect = document.getElementById("adm-weapons");
    const ammoSelect = document.getElementById("adm-ammo");
    const roomtypeSelect = document.getElementById("adm-roomtype");

    if (templateName === "LW 1v1") {
        titleInput.value = "Lone Wolf 1v1 Battle";
        mapSelect.value = "Random Map";
        modeSelect.value = "LW 1v1";
        slotsInput.value = "2";
        skillsSelect.value = "false";
        attributesSelect.value = "false";
        bodyshotSelect.value = "true";
        weaponsSelect.value = "All";
        ammoSelect.value = "false";
        roomtypeSelect.value = "Normal";
    } else if (templateName === "CS 4v4") {
        titleInput.value = "Clash Squad 4v4 Showdown";
        mapSelect.value = "Bermuda";
        modeSelect.value = "CS 4v4";
        slotsInput.value = "8";
        skillsSelect.value = "false";
        attributesSelect.value = "false";
        bodyshotSelect.value = "true";
        weaponsSelect.value = "All";
        ammoSelect.value = "false";
        roomtypeSelect.value = "Normal";
    } else if (templateName === "BR Squad") {
        titleInput.value = "Bermuda Battle Royale Squad";
        mapSelect.value = "Bermuda";
        modeSelect.value = "Squad";
        slotsInput.value = "48";
        skillsSelect.value = "false";
        attributesSelect.value = "false";
        bodyshotSelect.value = "true";
        weaponsSelect.value = "All";
        ammoSelect.value = "false";
        roomtypeSelect.value = "Tournament";
    } else if (templateName === "Sniper 1v1") {
        titleInput.value = "Sniper Only 1v1 Duel";
        mapSelect.value = "Random Map";
        modeSelect.value = "LW 1v1";
        slotsInput.value = "2";
        skillsSelect.value = "false";
        attributesSelect.value = "false";
        bodyshotSelect.value = "true";
        weaponsSelect.value = "Sniper Only";
        ammoSelect.value = "false";
        roomtypeSelect.value = "Normal";
    }
}

// Create tournament match
async function createMatchAdmin() {
    const title = document.getElementById("adm-title").value.trim();
    const date = document.getElementById("adm-date").value;
    const time = document.getElementById("adm-time").value;
    const map = document.getElementById("adm-map").value;
    const mode = document.getElementById("adm-mode").value;
    const prizePool = document.getElementById("adm-prizepool").value;
    const perKill = document.getElementById("adm-perkill").value;
    const entryFee = document.getElementById("adm-entryfee").value;
    const totalSlots = document.getElementById("adm-slots").value;
    
    // Custom settings
    const skills = document.getElementById("adm-skills").value === "true";
    const attributes = document.getElementById("adm-attributes").value === "true";
    const bodyShot = document.getElementById("adm-bodyshot").value === "true";
    const weapons = document.getElementById("adm-weapons").value;
    const unlimitedAmmo = document.getElementById("adm-ammo").value === "true";
    const roomType = document.getElementById("adm-roomtype").value;
    
    const assignedHost = document.getElementById("adm-assign-host").value;

    if (!title || !date || !time || !prizePool || !perKill || !entryFee || !totalSlots) {
        alert("Please fill all tournament details.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/admin/tournaments/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title, date, time, map, mode, prizePool, perKill, entryFee, totalSlots, assignedHost,
                skills, attributes, bodyShot, weapons, unlimitedAmmo, roomType
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.msg || "Could not launch match");
        }

        alert(`Lobby "${data.title}" successfully hosted and scheduled!`);
        
        // Reset inputs
        document.getElementById("adm-title").value = "";
        const templateSelector = document.getElementById("adm-template");
        if (templateSelector) templateSelector.value = "";
        fetchTournaments();
    } catch (err) {
        alert(err.message);
    }
}

// Retrieve users and role list
async function fetchAdminUsers() {
    const container = document.getElementById("admin-users-list-container");
    container.innerHTML = `<div class="text-center text-muted">Searching registry...</div>`;

    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (res.ok) {
            container.innerHTML = "";
            if (data.length === 0) {
                container.innerHTML = `<div class="text-center text-muted">No registered users in database.</div>`;
                return;
            }

            data.forEach(u => {
                if (u.phone === gameState.currentUser.phone) return; // Skip self

                const isHost = u.role === 'host';
                const roleToggleBtn = isHost
                    ? `<button class="adm-mini-btn btn-reject" onclick="changeUserRole('${u._id || u.id}', 'player')">Demote Player</button>`
                    : `<button class="adm-mini-btn btn-host-change" onclick="changeUserRole('${u._id || u.id}', 'host')">Promote Host</button>`;

                const card = document.createElement("div");
                card.className = "adm-item-card";
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>${u.username}</strong> (${u.phone})
                            <div style="font-size:10px; color:var(--text-sub); margin-top:2px;">Role: <span class="highlight-green">${u.role.toUpperCase()}</span> | Wallet: ₹${u.coins + u.winnings}</div>
                        </div>
                        <div style="width:110px;">
                            ${roleToggleBtn}
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (err) {
        container.innerHTML = `<div class="text-center text-muted">Error loading user database.</div>`;
    }
}

// Change role of a user (Host promotions)
async function changeUserRole(userId, targetRole) {
    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ role: targetRole })
        });

        if (res.ok) {
            alert(`User role successfully changed to ${targetRole}!`);
            fetchAdminUsers();
        } else {
            const data = await res.json();
            alert(data.msg || "Could not modify user role settings.");
        }
    } catch (err) {
        alert("Connection failure.");
    }
}

// Retrieve pending withdrawals
async function fetchAdminWithdrawals() {
    const container = document.getElementById("admin-withdrawals-container");
    container.innerHTML = `<div class="text-center text-muted">Searching pending withdrawals...</div>`;

    try {
        const res = await fetch(`${API_URL}/admin/withdrawals`, {
            headers: getAuthHeaders()
        });

        const data = await res.json();

        if (res.ok) {
            container.innerHTML = "";
            if (data.length === 0) {
                container.innerHTML = `<div class="text-center text-muted" style="padding:20px 0;">No pending withdrawal files to approve.</div>`;
                return;
            }

            data.forEach(w => {
                const date = new Date(w.date).toLocaleString();
                const card = document.createElement("div");
                card.className = "adm-item-card";
                card.innerHTML = `
                    <h4>Withdrawal Request: ₹${w.amount}</h4>
                    <div style="font-size:11px; color:var(--text-sub); margin-bottom:8px;">
                        <span>Warrior: ${w.user?.username} (${w.user?.phone})</span><br>
                        <span>Method: ${w.detail}</span><br>
                        <span>Details: <strong>${w.paymentDetails}</strong></span><br>
                        <span>Date: ${date}</span>
                    </div>
                    <div class="adm-item-btn-row">
                        <button class="adm-mini-btn btn-approve" onclick="resolveWithdrawal('${w._id}', 'approve')"><i class="fa-regular fa-circle-check"></i> Approve Transfer</button>
                        <button class="adm-mini-btn btn-reject" onclick="resolveWithdrawal('${w._id}', 'reject')"><i class="fa-regular fa-circle-xmark"></i> Reject & Refund</button>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (err) {
        container.innerHTML = `<div class="text-center text-muted">Error loading withdrawals list.</div>`;
    }
}

// Resolve pending withdrawal requests (Approve / Reject)
async function resolveWithdrawal(transactionId, action) {
    try {
        const res = await fetch(`${API_URL}/admin/withdrawals/${transactionId}/resolve`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ action })
        });

        if (res.ok) {
            alert(`Withdrawal request successfully ${action}d!`);
            fetchAdminWithdrawals();
        } else {
            const data = await res.json();
            alert(data.msg || "Could not resolve transaction");
        }
    } catch (err) {
        alert("Connection failure.");
    }
}

// Fetch Admin Earnings stats and commission history
async function fetchAdminEarnings() {
    const container = document.getElementById("admin-earnings-container");
    if (container) container.innerHTML = `<div class="text-center text-muted">Loading financials...</div>`;

    try {
        const res = await fetch(`${API_URL}/admin/earnings`, {
            headers: getAuthHeaders()
        });

        const data = await res.json();

        if (res.ok) {
            // Populate Revenue Grid
            document.getElementById("adm-earn-today").innerText = `₹${data.todayEarnings.toFixed(2)}`;
            document.getElementById("adm-earn-week").innerText = `₹${data.weeklyEarnings.toFixed(2)}`;
            document.getElementById("adm-earn-month").innerText = `₹${data.monthlyEarnings.toFixed(2)}`;
            document.getElementById("adm-earn-year").innerText = `₹${data.yearlyEarnings.toFixed(2)}`;
            document.getElementById("adm-earn-lifetime").innerText = `₹${data.lifetimeEarnings.toFixed(2)}`;

            // Populate System Analytics Grid
            document.getElementById("adm-stat-users").innerText = data.analytics.totalUsers;
            document.getElementById("adm-stat-regs").innerText = data.analytics.todayRegistrations;
            document.getElementById("adm-stat-deposits").innerText = `₹${data.analytics.todayDeposits.toFixed(2)}`;
            document.getElementById("adm-stat-withdrawals").innerText = `₹${data.analytics.todayWithdrawals.toFixed(2)}`;

            if (container) {
                container.innerHTML = "";
                if (data.transactions.length === 0) {
                    container.innerHTML = `<div class="text-center text-muted" style="padding:20px 0;">No commission payouts earned yet.</div>`;
                    return;
                }

                data.transactions.forEach(t => {
                    const date = new Date(t.date).toLocaleString();
                    const card = document.createElement("div");
                    card.className = "adm-item-card";
                    card.style.borderLeft = "4px solid var(--neon-green)";
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <h4 style="margin:0; color:var(--neon-green);">+ ₹${t.amount.toFixed(2)}</h4>
                            <span style="font-size:10px; color:var(--text-sub);">${date}</span>
                        </div>
                        <p style="font-size:11px; margin:0; color:var(--text-main);">${t.detail}</p>
                    `;
                    container.appendChild(card);
                });
            }
        }
    } catch (err) {
        console.error("Error loading admin earnings:", err);
        if (container) container.innerHTML = `<div class="text-center text-muted">Connection error loading reports.</div>`;
    }
}

// Retrieve pending deposits
async function fetchAdminDeposits() {
    const container = document.getElementById("admin-deposits-container");
    if (!container) return;
    container.innerHTML = `<div class="text-center text-muted">Searching deposit logs...</div>`;

    try {
        const res = await fetch(`${API_URL}/admin/deposits`, {
            headers: getAuthHeaders()
        });

        const data = await res.json();

        if (res.ok) {
            container.innerHTML = "";
            if (data.length === 0) {
                container.innerHTML = `<div class="text-center text-muted" style="padding:20px 0;">No successful deposits recorded yet.</div>`;
                return;
            }

            data.forEach(d => {
                const date = new Date(d.date).toLocaleString();
                const card = document.createElement("div");
                card.className = "adm-item-card";
                card.style.borderLeft = "4px solid var(--cyan)";
                card.innerHTML = `
                    <h4>Automatic Deposit: ₹${d.amount}</h4>
                    <div style="font-size:11px; color:var(--text-sub);">
                        <span>Warrior: ${d.user?.username} (${d.user?.phone})</span><br>
                        <span>Method: ${d.detail}</span><br>
                        <span>Transaction ID: <strong>${d.cashfreeOrderId || 'N/A'}</strong></span><br>
                        <span>Date: ${date}</span>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (err) {
        container.innerHTML = `<div class="text-center text-muted">Error loading deposits list.</div>`;
    }
}

// Send ticker announcement/alert
async function sendBroadcastAnnouncement() {
    const title = document.getElementById("adm-announce-title").value.trim();
    const content = document.getElementById("adm-announce-content").value.trim();
    const type = document.getElementById("adm-announce-type").value;

    if (!title || !content) {
        alert("Please provide both title and content.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/admin/announcements/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ title, content, type })
        });

        if (res.ok) {
            alert("Broadcast alert launched successfully!");
            document.getElementById("adm-announce-title").value = "";
            document.getElementById("adm-announce-content").value = "";
            fetchAnnouncements();
        } else {
            const data = await res.json();
            alert(data.msg || "Could not publish broadcast");
        }
    } catch (err) {
        alert("Connection failure.");
    }
}

// ==========================================
// MODAL GENERAL HELPERS
// ==========================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");
    if (modalId === "match-details-modal" && gameState.countdownInterval) {
        clearInterval(gameState.countdownInterval);
        gameState.countdownInterval = null;
    }
}

// ==========================================
// STARTUP ENGINE
// ==========================================
// Automatically verify official Cashfree payment order on page redirect
async function verifyCashfreeOrderAutomatically(orderId) {
    try {
        // Wait briefly for checkUserSession to load the token
        if (!gameState.token) {
            setTimeout(() => verifyCashfreeOrderAutomatically(orderId), 1000);
            return;
        }
        
        const res = await fetch(`${API_URL}/wallet/deposit/verify`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ orderId, isSimulatedSuccess: false })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            gameState.currentUser = data.user;
            updateWalletDisplay();
            renderWalletView();
            fetchTransactions();
            alert("Payment Verified! Balance successfully credited to your wallet via Cashfree.");
        } else {
            alert("Cashfree payment verification failed or is pending.");
        }
        
        // Clean URL parameter
        const newUrl = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, newUrl);
    } catch (err) {
        console.error("Order auto verification error:", err);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    checkUserSession();
    
    // Check if redirected from Cashfree checkout with order_id
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');
    if (orderId) {
        verifyCashfreeOrderAutomatically(orderId);
    }
    
    // Auto populate match date with tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const localDateStr = tomorrow.toISOString().split('T')[0];
    const dateInput = document.getElementById("adm-date");
    if (dateInput) {
        dateInput.value = localDateStr;
        document.getElementById("adm-time").value = "18:00";
    }
});
