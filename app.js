import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, onSnapshot, query, orderBy, 
  serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// PASTE YOUR FIREBASE CONFIG HERE
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// --- ELEMENTS ---
const loginScreen = document.getElementById('loginScreen');
const userNameInput = document.getElementById('userName');
const joinBtn = document.getElementById('joinBtn');
const postModal = document.getElementById('postModal');
const feedContainer = document.getElementById('feedContainer');

// --- 1. USER AUTH (Simple Random ID) ---
let currentUser = localStorage.getItem('nexusUser');
if (currentUser) {
    loginScreen.style.display = 'none';
    document.getElementById('profileTag').innerText = currentUser;
}

joinBtn.onclick = () => {
    const name = userNameInput.value.trim();
    if (name) {
        //const randomID = Math.floor(1000 + Math.random() * 9000);
        const finalName = name;
        localStorage.setItem('nexusUser', finalName);
        location.reload();
    }
};

// --- 2. MODAL LOGIC ---
document.getElementById('openModal').onclick = () => postModal.classList.remove('hidden');
document.getElementById('closeModal').onclick = () => postModal.classList.add('hidden');

// --- 3. SUBMIT POST ---
document.getElementById('submitPost').onclick = async () => {
    const content = document.getElementById('postContent').value.trim();
    if (!content) return;

    try {
        await addDoc(collection(db, "posts"), {
    user: currentUser,
    text: content,
    time: serverTimestamp(),
    likes: [] // ADDED THIS: stores user names/ids who liked
});
        document.getElementById('postContent').value = "";
        postModal.classList.add('hidden');
    } catch (e) { alert("Error posting: " + e.message); }
};


// --- 3.5 LIKE POST ---
const likePost = async (postId) => {
    const postRef = doc(db, "posts", postId);
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || []; // posts YOU liked
    
    if(likedPosts.includes(postId)){
        // Unlike
        await updateDoc(postRef, {
            likes: arrayRemove(currentUser)
        });
        localStorage.setItem('likedPosts', JSON.stringify(likedPosts.filter(id => id !== postId)));
    } else {
        // Like
        await updateDoc(postRef, {
            likes: arrayUnion(currentUser)
        });
        localStorage.setItem('likedPosts', JSON.stringify([...likedPosts, postId]));
    }
}
window.likePost = likePost; // make it global for onclick


// --- 4. REAL-TIME FEED ---
const q = query(collection(db, "posts"), orderBy("time", "desc"));
const likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || []; // get your liked posts

onSnapshot(q, (snapshot) => {
    feedContainer.innerHTML = "";
    if (snapshot.empty) {
        feedContainer.innerHTML = `<div class="text-center py-20 text-slate-500">No posts yet. Be the first!</div>`;
    }
    snapshot.forEach(docSnap => {
        const post = docSnap.data();
        const postId = docSnap.id;
        const likesCount = post.likes ? post.likes.length : 0;
        const isLiked = post.likes && post.likes.includes(currentUser); // did YOU like this?

        const time = post.time ? post.time.toDate() : null;
        const timeText = time 
            ? time.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) 
            : "Just now";

        const postHtml = `
            <div class="glass-card p-5 rounded-2xl mb-4 border-slate-800 post-entry">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-blue-500 rounded-full mr-3"></div>
                        <span class="text-sm font-bold">${post.user}</span>
                    </div>
                    <span class="text-xs text-slate-500">${timeText}</span>
                </div>
                <p class="post-text text-slate-200 leading-relaxed mb-3">${post.text}</p>
                
                <!-- LIKE BUTTON SECTION -->
                <div class="flex items-center gap-2 pt-2 border-t border-slate-700">
                    <button onclick="likePost('${postId}')" class="flex items-center gap-1 text-sm transition ${isLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        <span>${likesCount}</span>
                    </button>
                </div>
            </div>
        `;
        feedContainer.innerHTML += postHtml;
    });
});