
#Restaurant Complete project 

1 create token from the server
2 Send token to frontend and set to browser cookie / local store
3 Send token again frontend to server
4 verify token in the server (make a middleware functions (req, res, next) )
 
 
এরপর টেকেন দেখার জন্য মিডলওয়ার ফাংশন কিভাবে লিখে সেটাও কিন্তু সিম্পল। এরপর ভিতরে হেডার থেকে ক্যামনে টোকেন টা আছে কিনা চেক করে সেটাও সিম্পল। তারপর হেডার কে স্প্লিট করে ক্যামনে টোকেন এর মান বের করে। এটাকেও কিন্তু সিম্পল বলতেই হবে। 

আর লাস্টের স্টেপ থাকে জাস্ট decode করার কোড কপি মারা। err খাইলে তাকে স্ট্যাটাস ধরিয়ে দেয়া। req এর মধ্যে decoded সেট করে নেক্সট মেরে দেয়া। 
