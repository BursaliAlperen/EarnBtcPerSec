let DB = {};
const DB_KEY = 'earnBtcPerSecDB';
let saveTimeout = null;

function _save(immediate = false) {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    DB.lastUpdated = Date.now(); // Always update timestamp on save
    if (immediate) {
        localStorage.setItem(DB_KEY, JSON.stringify(DB));
    } else {
        saveTimeout = setTimeout(() => {
            localStorage.setItem(DB_KEY, JSON.stringify(DB));
            saveTimeout = null;
        }, 2000); // Debounce save to avoid hammering localStorage
    }
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
            withdrawalRequests: [],
            lastUpdated: Date.now()
        };
    }
}

function processOfflineEarnings(totalSeconds, baseAmount) {
    DB.users.forEach(user => {
        if (user.isAdmin) {
            if (user.wallets.length > 0) {
                const totalEarned = totalSeconds * baseAmount;
                user.wallets.forEach(wallet => {
                    wallet.balance += totalEarned;
                });
            }
            return; // next user
        }

        if (user.wallets.length === 0) return;

        let secondsProcessed = 0;
        let simulatedTime = new Date(DB.lastUpdated); // Start from the last update time

        while (secondsProcessed < totalSeconds) {
            // Find the last reset time relative to the current simulation time
            let lastResetTime = new Date(simulatedTime);
            lastResetTime.setHours(0, 0, 0, 0);

            // Check if user needs a reset for this simulation step
            if (!user.earningTimeResetAt || user.earningTimeResetAt < lastResetTime.getTime()) {
                user.earningTimeLeft = 6 * 60 * 60;
                user.earningTimeResetAt = lastResetTime.getTime();
            }

            // Find time until next reset from simulationTime
            let nextResetTime = new Date(lastResetTime);
            nextResetTime.setDate(nextResetTime.getDate() + 1);
            const secondsToNextReset = Math.max(1, Math.floor((nextResetTime.getTime() - simulatedTime.getTime()) / 1000));

            const secondsRemainingInOfflinePeriod = totalSeconds - secondsProcessed;
            const secondsToProcessInChunk = Math.min(secondsToNextReset, secondsRemainingInOfflinePeriod);
            
            if (secondsToProcessInChunk <= 0) { // Safety break
                break;
            }

            const earnableSeconds = Math.min(secondsToProcessInChunk, user.earningTimeLeft || 0);

            if (earnableSeconds > 0) {
                const amountForChunk = earnableSeconds * baseAmount;
                user.wallets.forEach(wallet => {
                    wallet.balance += amountForChunk;
                });
                user.earningTimeLeft -= earnableSeconds;

                user.earningsLog.push({
                    amount: amountForChunk * user.wallets.length,
                    timestamp: simulatedTime.getTime()
                });
            }

            secondsProcessed += secondsToProcessInChunk;
            simulatedTime.setSeconds(simulatedTime.getSeconds() + secondsToProcessInChunk);
        }
        
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        user.earningsLog = user.earningsLog.filter(e => e.timestamp > oneWeekAgo);
    });
}

export function init() {
    _load();

    // Catch up on offline earnings
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - (DB.lastUpdated || now)) / 1000);

    if (elapsedSeconds > 1) { // Only catch up if more than a second has passed
        console.log(`Catching up on ${elapsedSeconds} seconds of offline time.`);
        processOfflineEarnings(elapsedSeconds, 0.00000000001);
    }
    
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
            referredBy: null,
            earningTimeLeft: 6 * 60 * 60, // Admins have unlimited time effectively, but we set it for consistency
            earningTimeResetAt: Date.now()
        });
    }

    // Retroactively add referral codes to users who don't have one
    DB.users.forEach(user => {
        if (!user.referralCode) {
            user.referralCode = user.email.split('@')[0].replace(/[^a-z0-9]/gi, '') + Math.random().toString(36).substring(2, 6);
        }
        if (user.earningTimeLeft === undefined) {
            user.earningTimeLeft = 0;
        }
        if (user.earningTimeResetAt === undefined) {
            user.earningTimeResetAt = null;
        }
        if (user.lastSeen === undefined) {
            user.lastSeen = null;
        }
    });

    _save(true);
}

// --- User Management ---
export function login(email, password) {
    const user = getUser(email);
    if (user && user.password === password) {
        DB.loggedInUserEmail = email;
        _save(true);
        return true;
    }
    return false;
}

export function logout() {
    DB.loggedInUserEmail = null;
    _save(true);
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
        referredBy: null,
        earningTimeLeft: 0, // Will be reset on the first earning cycle
        earningTimeResetAt: null,
        lastSeen: null
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
    _save(true);
    return true;
}

export function updateUserActivity(userEmail) {
    const user = getUser(userEmail);
    if(user) {
        user.lastSeen = Date.now();
        _save(); // Debounced save is fine here
    }
}

export function deleteUser(email) {
    DB.users = DB.users.filter(u => u.email !== email);
    _save(true);
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
    _save(true);
    return true;
}

export function deleteWallet(userEmail, address) {
    const user = getUser(userEmail);
    if (!user) return false;

    user.wallets = user.wallets.filter(w => w.address !== address);
    _save(true);
    return true;
}

export function updateBalance(userEmail, address, newBalance) {
    const user = getUser(userEmail);
    if (!user) return false;

    const wallet = user.wallets.find(w => w.address === address);
    if (wallet) {
        wallet.balance = newBalance;
        _save(true);
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
    _save(true);
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
    
    _save(true);
    return true;
}

// --- Earning ---
function _handleUserEarning(user, baseAmount) {
    // Admins are not subject to the earning time limit
    if (user.isAdmin) {
        if (user.wallets.length > 0) {
            user.wallets.forEach(wallet => {
                wallet.balance += baseAmount;
            });
        }
        return; // Skip rest of the logic for admins
    }

    const now = new Date();
    // Calculate timestamp for the last midnight.
    const lastResetTime = new Date(now);
    lastResetTime.setHours(0, 0, 0, 0);
    
    const lastResetTimestamp = lastResetTime.getTime();

    // Check if a reset is needed.
    if (!user.earningTimeResetAt || user.earningTimeResetAt < lastResetTimestamp) {
        user.earningTimeLeft = 6 * 60 * 60; // 6 hours in seconds
        user.earningTimeResetAt = lastResetTimestamp;
    }

    if (user.earningTimeLeft > 0 && user.wallets.length > 0) {
        // User has time left and wallets to earn into
        user.wallets.forEach(wallet => {
            wallet.balance += baseAmount;
        });

        // Decrement time left
        user.earningTimeLeft -= 1;

        // Add to earnings log
        user.earningsLog.push({
            amount: baseAmount * user.wallets.length,
            timestamp: Date.now()
        });
        
        // Prune old earnings logs
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        user.earningsLog = user.earningsLog.filter(e => e.timestamp > oneWeekAgo);
    }
}

export function processEarnings(amount) {
    DB.users.forEach(user => {
        _handleUserEarning(user, amount);
    });
    _save(); // Debounced save
}