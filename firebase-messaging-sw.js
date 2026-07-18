importScripts(
"https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);

importScripts(
"https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);


firebase.initializeApp({

  apiKey: "AIzaSyCzNeQzzoUuMVhZEzE9IEZ8WgVBcTyNuHc",

  authDomain: "test-54a1b.firebaseapp.com",

  projectId: "test-54a1b",

  storageBucket: "test-54a1b.firebasestorage.app",

  messagingSenderId: "401926525341",

  appId: "1:401926525341:web:078a2f16ea8219799e9f74"

});


const messaging = firebase.messaging();


messaging.onBackgroundMessage((payload)=>{


 self.registration.showNotification(

   payload.notification.title,

   {

     body: payload.notification.body,

     icon: "/icon.png"

   }

 );


});
