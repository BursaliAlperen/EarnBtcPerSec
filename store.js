let DB = {};
const DB_KEY = 'earnBtcPerMinDB';

function _save() {
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
}

function _load() {
    const data = localStorage.getItem(DB_KEY);
    if (data) {
        DB = JSON.parse(data);
        DB.withdrawalRequests = DB.withdrawalRequests || [];
    } else {
        DB = {
            users: [],
            loggedInUserEmail: null,
            withdrawalRequests: []
        };
    }
}

export function init() {
    _load();
    // Create Super Admin if not exists
    if (!getUser('superadmin@example.com')) {
        DB.users.push({
            username: 'SuperAdmin',
            email: 'superadmin@example.com',
            password: 'Alperen1', // In a real app, hash this!
            isAdmin: true,
            wallets: [],
            earningsLog: [],
            referralCode: 'superadmin',
            referredBy: null
        });
    }

    // Retroactively add referral codes to users who don't have one
    DB.users.forEach(user => {
        if (!user.referralCode) {
            user.referralCode = user.email.split('@')[0].replace(/[^a-z0-9]/gi, '') + Math.random().toString(36).substring(2, 6);
        }
    });

    _save();
}

// --- User Management ---
export function login(email, password) {
    const user = getUser(email);
    if (user && user.password === password) {
        DB.loggedInUserEmail = email;
        _save();
        return true;
    }
    return false;
}

export function logout() {
    DB.loggedInUserEmail = null;
    _save();
}

export function getLoggedInUser() {
    if (!DB.loggedInUserEmail) return null;
    return getUser(DB.loggedInUserEmail);
}

export function getUser(email) {
    return DB.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function getAllUsers() {
    return DB.users;
}

export function addUser(username, email, password, referredByCode) {
    if (getUser(email)) {
        return false; // User already exists
    }

    const referralCode = email.split('@')[0].replace(/[^a-z0-9]/gi, '') + Math.random().toString(36).substring(2, 6);

    const newUser = {
        username,
        email,
        password, // Again, hash in real apps
        isAdmin: false,
        wallets: [],
        earningsLog: [],
        referralCode: referralCode,
        referredBy: null
    };
    
    if (referredByCode) {
        const referrer = DB.users.find(u => u.referralCode.toLowerCase() === referredByCode.toLowerCase());
        if(referrer) {
            newUser.referredBy = referrer.email;
            // Give bonus to referrer's first wallet
            if (referrer.wallets.length > 0) {
                const REFERRAL_BONUS = 0.00005;
                referrer.wallets[0].balance += REFERRAL_BONUS;
            }
        }
    }

    DB.users.push(newUser);
    _save();
    return true;
}

export function deleteUser(email) {
    DB.users = DB.users.filter(u => u.email !== email);
    _save();
    return true;
}

// --- Wallet Management ---
export function addWallet(userEmail, address) {
    const user = getUser(userEmail);
    if (!user) return false;
    
    const addressExists = user.wallets.some(w => w.address === address);
    if (addressExists) return false;

    user.wallets.push({
        address: address,
        balance: 0,
        createdAt: Date.now()
    });
    _save();
    return true;
}

export function deleteWallet(userEmail, address) {
    const user = getUser(userEmail);
    if (!user) return false;

    user.wallets = user.wallets.filter(w => w.address !== address);
    _save();
    return true;
}

export function updateBalance(userEmail, address, newBalance) {
    const user = getUser(userEmail);
    if (!user) return false;

    const wallet = user.wallets.find(w => w.address === address);
    if (wallet) {
        wallet.balance = newBalance;
        _save();
        return true;
    }
    return false;
}

// --- Withdrawal Management ---
export function createWithdrawalRequest(userEmail, walletAddress) {
    const user = getUser(userEmail);
    const wallet = user?.wallets.find(w => w.address === walletAddress);

    if (!wallet || wallet.balance <= 0) return false;

    const amount = wallet.balance;
    wallet.balance = 0; // Deduct amount immediately

    const newRequest = {
        id: `wr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        userEmail,
        walletAddress,
        amount,
        status: 'pending', // 'pending', 'approved', 'denied'
        timestamp: Date.now()
    };

    DB.withdrawalRequests.push(newRequest);
    _save();
    return true;
}

export function getWithdrawalRequests() {
    return DB.withdrawalRequests.sort((a, b) => b.timestamp - a.timestamp); // show newest first
}

export function processWithdrawalRequest(requestId, newStatus) {
    const request = DB.withdrawalRequests.find(r => r.id === requestId);
    if (!request) return false;

    if (request.status !== 'pending') return false; // Already processed

    request.status = newStatus;

    if (newStatus === 'denied') {
        // Refund the user
        const user = getUser(request.userEmail);
        if (user) {
            let wallet = user.wallets.find(w => w.address === request.walletAddress);
            if (wallet) {
                wallet.balance += request.amount;
            } else {
                // If wallet was deleted in the meantime, create it again to refund.
                user.wallets.push({
                    address: request.walletAddress,
                    balance: request.amount,
                    createdAt: Date.now()
                });
            }
        }
    }
    // If 'approved', the money is gone from the system.
    
    _save();
    return true;
}

// --- Earning ---
export function processEarnings(amount) {
    _load(); // Ensure we have the latest data before processing
    DB.users.forEach(user => {
        if(user.wallets.length > 0) {
            user.wallets.forEach(wallet => {
                wallet.balance += amount;
            });
            // Add a single earning record per user per cycle for simplicity
            user.earningsLog.push({
                amount: amount * user.wallets.length,
                timestamp: Date.now()
            });
            // Prune old earnings logs to prevent localStorage bloat
            const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            user.earningsLog = user.earningsLog.filter(e => e.timestamp > oneWeekAgo);
        }
    });
    _save();
}