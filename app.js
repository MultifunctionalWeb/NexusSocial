import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth, onAuthStateChanged, signInAnonymously,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// PASTE YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyAl74mArx9ZueCMIrMUy-B2hNc9-F60IuM",
  authDomain: "nexussocial-83888.firebaseapp.com",
  projectId: "nexussocial-83888",
  storageBucket: "nexussocial-83888.firebasestorage.app",
  messagingSenderId: "293398793234",
  appId: "1:293398793234:web:9ec8d5a50e3f6b415d1ccb",
  measurementId: "G-S2F7X75NZV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- ELEMENTS ---
const loginScreen = document.getElementById('loginScreen');
const userEmailInput = document.getElementById('userEmail');
const userPassInput = document.getElementById('userPass');
const guestNameInput = document.getElementById('guestName');
const emailBtn = document.getElementById('emailBtn');
const guestBtn = document.getElementById('guestBtn');
const postModal = document.getElementById('postModal');
const feedContainer = document.getElementById('feedContainer');
const profileTag = document.getElementById('profileTag');

let currentUser = null;
let displayName = localStorage.getItem('nexusDisplayName') || 'Guest';

// --- 1. AUTH STATE LISTENER ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loginScreen.style.display = 'none';

    // If guest, use saved name. If email, use email prefix
    const name = user.isAnonymous? displayName : user.email.split('@')[0];
    profileTag.innerText = name;
    loadFeed();
  } else {
    currentUser = null;
    loginScreen.style.display = 'flex';
    feedContainer.innerHTML = `<div class="text-center py-20 text-slate-500">Please login to see feed</div>`;
  }
});

// --- 2A. EMAIL LOGIN / SIGNUP ---
emailBtn.onclick = async () => {
    const email = userEmailInput.value.trim();
    const pass = userPassInput.value.trim();
    if (!email ||!pass) return alert("Please enter email and password");

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        if(e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential'){
            try {
                await createUserWithEmailAndPassword(auth, email, pass);
            } catch (err) {
                alert("Signup Error: " + err.message);
            }
        } else {
            alert("Login Error: " + e.message);
        }
    }
};

// --- 2B. GUEST LOGIN WITH NAME ---
guestBtn.onclick = async () => {
    const name = guestNameInput.value.trim();
    if (!name) return alert("Please enter a name to join as Guest");

    displayName = name;
    localStorage.setItem('nexusDisplayName', name); // save so it persists

    try {
        await signInAnonymously(auth);
    } catch (e) {
        alert("Guest login failed: " + e.message);
    }
};

// --- 3. MODAL LOGIC ---
document.getElementById('openModal').onclick = () => postModal.classList.remove('hidden');
document.getElementById('closeModal').onclick = () => postModal.classList.add('hidden');

// --- 4. SUBMIT POST ---
document.getElementById('submitPost').onclick = async () => {
    const content = document.getElementById('postContent').value.trim();
    if (!content ||!currentUser) return;

    const name = currentUser.isAnonymous? displayName : currentUser.email.split('@')[0];

    try {
        await addDoc(collection(db, "posts"), {
            userId: currentUser.uid,
            userName: name, // saves either guest name or email name
            text: content,
            time: serverTimestamp(),
            likes: []
        });
        document.getElementById('postContent').value = "";
        postModal.classList.add('hidden');
    } catch (e) { alert("Error posting: " + e.message); }
};

// --- 5. LIKE POST ---
const likePost = async (postId) => {
    if (!currentUser) return;
    const postRef = doc(db, "posts", postId);
    const uid = currentUser.uid;

    try {
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) return;
        const likes = postSnap.data().likes || [];

        if(likes.includes(uid)){
            await updateDoc(postRef, { likes: arrayRemove(uid) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(uid) });
        }
    } catch (e) {
        alert("Error liking post: " + e.message);
    }
}
window.likePost = likePost;

// --- 6. REAL-TIME FEED ---
function loadFeed() {
    const q = query(collection(db, "posts"), orderBy("time", "desc"));

    onSnapshot(q, (snapshot) => {
        feedContainer.innerHTML = "";
        if (snapshot.empty) {
            feedContainer.innerHTML = `<div class="text-center py-20 text-slate-500">No posts yet. Be the first!</div>`;
        }
        snapshot.forEach(docSnap => {
            const post = docSnap.data();
            const postId = docSnap.id;
            const likesCount = post.likes? post.likes.length : 0;
            const isLiked = post.likes && currentUser && post.likes.includes(currentUser.uid);

            // Fallback for old posts
            const nameToShow = post.userName || post.user || 'Unknown';

            const time = post.time? post.time.toDate() : null;
            const timeText = time
             ? time.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : "Just now";

            const postHtml = `
                <div class="glass-card p-5 rounded-2xl mb-4 border-slate-800 post-entry">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center">
                            <div class="w-8 h-8 bg-blue-500 rounded-full mr-3"></div>
                            <span class="text-sm font-bold">${nameToShow}</span>
                        </div>
                        <span class="text-xs text-slate-500">${timeText}</span>
                    </div>
                    <p class="post-text text-slate-200 leading-relaxed mb-3">${post.text}</p>
                    <div class="flex items-center gap-2 pt-2 border-t border-slate-700">
                        <button onclick="likePost('${postId}')" class="flex items-center gap-1 text-sm transition ${isLiked? 'text-red-500' : 'text-slate-400 hover:text-red-500'}">
                            <i class="${isLiked? 'fas' : 'far'} fa-heart"></i>
                            <span>${likesCount}</span>
                        </button>
                    </div>
                </div>
            `;
            feedContainer.innerHTML += postHtml;
        });
    });
}